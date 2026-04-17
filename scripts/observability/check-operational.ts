import fs from 'node:fs';
import path from 'node:path';
import { computeCanonicalSlis } from '../../services/observability/sli-computation';
import { createReliabilityEvent } from '../../services/observability/event-schema';
import { evaluateSloPolicy } from '../../services/observability/slo-policy';
import { evaluatePhaseBPromotion, PhaseBPromotionInput } from '../../services/observability/promotion-gate';
import { ObservabilityRollbackPlan, validateRollbackBoundary } from '../../services/observability/rollback-guard';

interface OperationalResult {
  check: string;
  pass: boolean;
  details: string;
}

function writeReport(results: OperationalResult[]): void {
  const reportPath = path.resolve(process.cwd(), 'observability-operational-report.json');
  const payload = {
    generatedAt: new Date().toISOString(),
    status: results.every((item) => item.pass) ? 'pass' : 'advisory-fail',
    results,
  };

  fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2), 'utf8');
}

function main(): void {
  const results: OperationalResult[] = [];
  const simulatedEvents = [
    createReliabilityEvent({
      eventName: 'query_request_started',
      requestId: 'req-1',
      route: '/query',
      reliability: { degraded: false },
    }),
    createReliabilityEvent({
      eventName: 'query_request_started',
      requestId: 'req-2',
      route: '/query',
      reliability: { degraded: false },
    }),
    createReliabilityEvent({
      eventName: 'query_request_completed',
      requestId: 'req-2',
      route: '/query',
      reliability: {
        degraded: false,
        latencyMs: 860,
      },
    }),
    createReliabilityEvent({
      eventName: 'query_request_completed',
      requestId: 'req-1',
      route: '/query',
      reliability: { degraded: false, latencyMs: 420 },
    }),
    createReliabilityEvent({
      eventName: 'rag_provider_retry',
      requestId: 'req-2',
      route: '/query',
      reliability: { degraded: false, retryable: true, attemptsUsed: 1 },
    }),
  ];

  const sli = computeCanonicalSlis(simulatedEvents, {
    startedAt: '2026-04-17T00:00:00.000Z',
    endedAt: '2026-04-17T01:00:00.000Z',
  });
  const policy = evaluateSloPolicy(sli);

  results.push({
    check: 'simulated_window_policy_evaluation',
    pass: policy.severity !== 'critical',
    details: `severity=${policy.severity} reasons=${policy.reasons.join('|') || 'none'}`,
  });

  results.push({
    check: 'taxonomy_integrity',
    pass: sli.integrityFailures.length === 0,
    details: sli.integrityFailures.length === 0 ? 'all required families present' : sli.integrityFailures.join('|'),
  });

  results.push({
    check: 'degraded_baseline_guardrail',
    pass: (sli.degradedResponses.value ?? 0) <= 0.02,
    details: `degraded_rate=${sli.degradedResponses.value ?? 'n/a'} target<=0.02`,
  });

  const promotionFixture = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'scripts/observability/fixtures/phase-b-promotion-fixture.json'), 'utf8'),
  ) as { advisoryCandidate: PhaseBPromotionInput; failingCandidate: PhaseBPromotionInput };
  const promotionAdvisory = evaluatePhaseBPromotion(promotionFixture.advisoryCandidate);
  const promotionFailing = evaluatePhaseBPromotion(promotionFixture.failingCandidate);
  results.push({
    check: 'phase_b_promotion_parity_advisory',
    pass: promotionAdvisory.enforceable,
    details: promotionAdvisory.enforceable
      ? 'advisory candidate meets promotion criteria'
      : promotionAdvisory.blockingReasons.join('|'),
  });
  results.push({
    check: 'phase_b_promotion_guard_blocks_drift',
    pass: !promotionFailing.enforceable,
    details: `blocked_reasons=${promotionFailing.blockingReasons.join('|') || 'none'}`,
  });

  const rollbackFixture = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'scripts/observability/fixtures/rollback-boundary-fixture.json'), 'utf8'),
  ) as { validPlan: ObservabilityRollbackPlan; invalidPlan: ObservabilityRollbackPlan };
  const rollbackEvents = [
    createReliabilityEvent({
      eventName: 'query_request_started',
      requestId: 'op-rollback-1',
      route: '/query',
      reliability: { degraded: false },
    }),
    createReliabilityEvent({
      eventName: 'query_request_completed',
      requestId: 'op-rollback-1',
      route: '/query',
      reliability: { degraded: false, latencyMs: 210 },
    }),
    createReliabilityEvent({
      eventName: 'query_request_degraded',
      requestId: 'op-rollback-2',
      route: '/query',
      reliability: { degraded: true, retryable: true, code: 'UPSTREAM_TEMPORARY_UNAVAILABLE' },
    }),
  ];
  const rollbackValid = validateRollbackBoundary(rollbackFixture.validPlan, rollbackEvents);
  const rollbackInvalid = validateRollbackBoundary(rollbackFixture.invalidPlan, rollbackEvents);
  results.push({
    check: 'rollback_boundary_valid_plan',
    pass: rollbackValid.valid,
    details: rollbackValid.valid ? 'valid rollback accepted' : rollbackValid.errors.join('|'),
  });
  results.push({
    check: 'rollback_boundary_rejects_invalid_plan',
    pass: !rollbackInvalid.valid,
    details: rollbackInvalid.errors.join('|') || 'none',
  });

  writeReport(results);

  if (!results.every((item) => item.pass)) {
    process.exitCode = 1;
  }
}

main();
