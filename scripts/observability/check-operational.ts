import fs from 'node:fs';
import path from 'node:path';
import { computeCanonicalSlis } from '../../services/observability/sli-computation';
import { createReliabilityEvent } from '../../services/observability/event-schema';
import { evaluateSloPolicy } from '../../services/observability/slo-policy';
import { evaluatePhaseBPromotion, PhaseBPromotionInput } from '../../services/observability/promotion-gate';
import { ObservabilityRollbackPlan, validateRollbackBoundary } from '../../services/observability/rollback-guard';
import {
  evaluateOperationalGate,
  parseOperationalMode,
  parsePullRequestLabels,
  validateObservabilityOverride,
} from '../../services/observability/operational-override';

interface OperationalResult {
  check: string;
  pass: boolean;
  severity: 'warning' | 'critical';
  category: 'risk' | 'guard';
  details: string;
}

const RISK_CHECKS = new Set<string>([
  'simulated_window_policy_evaluation',
  'taxonomy_integrity',
  'degraded_baseline_guardrail',
]);

function classifyCheckCategory(check: string): 'risk' | 'guard' {
  return RISK_CHECKS.has(check) ? 'risk' : 'guard';
}

function writeReport(payload: {
  status: 'pass' | 'fail' | 'advisory-fail';
  mode: 'advisory' | 'soft-block' | 'hard-block';
  gate: ReturnType<typeof evaluateOperationalGate>;
  override: ReturnType<typeof validateObservabilityOverride>;
  labelsParseErrors: string[];
  results: OperationalResult[];
}): void {
  const reportPath = path.resolve(process.cwd(), 'observability-operational-report.json');
  const riskFindings = payload.results.filter((result) => result.category === 'risk');
  const guardFindings = payload.results.filter((result) => result.category === 'guard');
  const report = {
    generatedAt: new Date().toISOString(),
    status: payload.status,
    mode: payload.mode,
    gate: payload.gate,
    override: payload.override,
    labelsParseErrors: payload.labelsParseErrors,
    summary: {
      risk: {
        total: riskFindings.length,
        failing: riskFindings.filter((result) => !result.pass).map((result) => ({
          check: result.check,
          severity: result.severity,
          details: result.details,
        })),
      },
      guard: {
        total: guardFindings.length,
        failing: guardFindings.filter((result) => !result.pass).map((result) => ({
          check: result.check,
          severity: result.severity,
          details: result.details,
        })),
      },
    },
    results: payload.results,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
}

function main(): void {
  const findings: OperationalResult[] = [];
  const mode = parseOperationalMode(process.env.OBSERVABILITY_OPERATIONAL_MODE);
  const labelsParsing = parsePullRequestLabels(process.env.GITHUB_PR_LABELS_JSON);
  const override = validateObservabilityOverride({
    prLabels: labelsParsing.labels,
    prBody: process.env.GITHUB_PR_BODY ?? '',
  });

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

  findings.push({
    check: 'simulated_window_policy_evaluation',
    pass: policy.severity === 'none',
    severity: policy.severity === 'critical' ? 'critical' : 'warning',
    category: classifyCheckCategory('simulated_window_policy_evaluation'),
    details: `severity=${policy.severity} reasons=${policy.reasons.join('|') || 'none'}`,
  });

  findings.push({
    check: 'taxonomy_integrity',
    pass: sli.integrityFailures.length === 0,
    severity: 'critical',
    category: classifyCheckCategory('taxonomy_integrity'),
    details: sli.integrityFailures.length === 0 ? 'all required families present' : sli.integrityFailures.join('|'),
  });

  findings.push({
    check: 'degraded_baseline_guardrail',
    pass: (sli.degradedResponses.value ?? 0) <= 0.02,
    severity: 'warning',
    category: classifyCheckCategory('degraded_baseline_guardrail'),
    details: `degraded_rate=${sli.degradedResponses.value ?? 'n/a'} target<=0.02`,
  });

  const promotionFixture = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'scripts/observability/fixtures/phase-b-promotion-fixture.json'), 'utf8'),
  ) as { advisoryCandidate: PhaseBPromotionInput; failingCandidate: PhaseBPromotionInput };
  const promotionAdvisory = evaluatePhaseBPromotion(promotionFixture.advisoryCandidate);
  const promotionFailing = evaluatePhaseBPromotion(promotionFixture.failingCandidate);
  findings.push({
    check: 'phase_b_promotion_parity_advisory',
    pass: promotionAdvisory.enforceable,
    severity: 'warning',
    category: classifyCheckCategory('phase_b_promotion_parity_advisory'),
    details: promotionAdvisory.enforceable
      ? 'advisory candidate meets promotion criteria'
      : promotionAdvisory.blockingReasons.join('|'),
  });
  findings.push({
    check: 'phase_b_promotion_guard_blocks_drift',
    pass: !promotionFailing.enforceable,
    severity: 'critical',
    category: classifyCheckCategory('phase_b_promotion_guard_blocks_drift'),
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
  findings.push({
    check: 'rollback_boundary_valid_plan',
    pass: rollbackValid.valid,
    severity: 'critical',
    category: classifyCheckCategory('rollback_boundary_valid_plan'),
    details: rollbackValid.valid ? 'valid rollback accepted' : rollbackValid.errors.join('|'),
  });
  findings.push({
    check: 'rollback_boundary_rejects_invalid_plan',
    pass: !rollbackInvalid.valid,
    severity: 'critical',
    category: classifyCheckCategory('rollback_boundary_rejects_invalid_plan'),
    details: rollbackInvalid.errors.join('|') || 'none',
  });

  const gate = evaluateOperationalGate({
    mode,
    findings,
    override,
  });

  const status: 'pass' | 'fail' | 'advisory-fail' = gate.blocked
    ? 'fail'
    : findings.every((item) => item.pass)
      ? 'pass'
      : 'advisory-fail';

  writeReport({
    status,
    mode,
    gate,
    override,
    labelsParseErrors: labelsParsing.errors,
    results: findings,
  });

  if (gate.blocked) {
    process.exitCode = 1;
  }
}

main();
