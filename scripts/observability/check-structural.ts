import fs from 'node:fs';
import path from 'node:path';
import {
  createReliabilityEvent,
  validateReliabilityEvent,
} from '../../services/observability/event-schema';
import { validateAlertRule } from '../../services/observability/alert-rules';
import { computeCanonicalSlis } from '../../services/observability/sli-computation';
import { evaluatePhaseBPromotion } from '../../services/observability/promotion-gate';
import { validateRollbackBoundary } from '../../services/observability/rollback-guard';

interface StructuralCheckResult {
  check: string;
  pass: boolean;
  details: string;
}

function writeReport(results: StructuralCheckResult[]): void {
  const reportPath = path.resolve(process.cwd(), 'observability-structural-report.json');
  const payload = {
    generatedAt: new Date().toISOString(),
    status: results.every((item) => item.pass) ? 'pass' : 'fail',
    results,
  };

  fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2), 'utf8');
}

function main(): void {
  const results: StructuralCheckResult[] = [];

  const sampleEvent = createReliabilityEvent({
    eventName: 'query_request_completed',
    requestId: 'req-check',
    route: '/query',
    reliability: {
      degraded: false,
      latencyMs: 120,
    },
  });
  const eventValidation = validateReliabilityEvent(sampleEvent);
  results.push({
    check: 'reliability_event_schema',
    pass: eventValidation.valid,
    details: eventValidation.valid ? 'schema ok' : eventValidation.errors.join(', '),
  });

  const sli = computeCanonicalSlis(
    [
      createReliabilityEvent({
        eventName: 'query_request_started',
        requestId: 'req-1',
        route: '/query',
        reliability: { degraded: false },
      }),
      createReliabilityEvent({
        eventName: 'query_request_completed',
        requestId: 'req-1',
        route: '/query',
        reliability: { degraded: false, latencyMs: 150 },
      }),
      createReliabilityEvent({
        eventName: 'rag_provider_retry',
        requestId: 'req-1',
        route: '/query',
        reliability: { retryable: true },
      }),
    ],
    {
      startedAt: '2026-04-17T00:00:00.000Z',
      endedAt: '2026-04-17T01:00:00.000Z',
    },
  );

  results.push({
    check: 'sli_formula_determinism',
    pass: sli.formulaVersion === 'v1' && sli.eligibleQueryRequests === 1,
    details: `formulaVersion=${sli.formulaVersion} eligibleQueryRequests=${sli.eligibleQueryRequests}`,
  });

  const alertRuleValidation = validateAlertRule({
    id: 'availability-warning',
    sli: 'availability',
    severity: 'warning',
    condition: {
      window: '6h',
      operator: '<',
      value: 0.995,
      evaluationPeriods: 2,
    },
    ownership: {
      primaryOwner: 'team-backend-oncall',
      secondaryOwner: 'team-platform-oncall',
      escalationPath: '#incident-backend',
    },
    runbookUrl: 'docs/runbooks/rag-reliability.md',
    correlationQueryRef: 'requestId:req-*',
    dedupeKeyTemplate: 'availability-warning-{window}',
    enabled: true,
    policyVersion: 'v1',
  });
  results.push({
    check: 'alert_rule_contract',
    pass: alertRuleValidation.valid,
    details: alertRuleValidation.valid ? 'ownership and runbook complete' : alertRuleValidation.errors.join(', '),
  });

  const ownershipDoc = path.resolve(process.cwd(), 'docs/observability/ownership-matrix.md');
  const policyDoc = path.resolve(process.cwd(), 'docs/observability/slo-policy-v1.md');
  results.push({
    check: 'doc_reference_integrity',
    pass: fs.existsSync(ownershipDoc) && fs.existsSync(policyDoc),
    details: 'ownership and policy docs must exist',
  });

  const promotionFixturePath = path.resolve(process.cwd(), 'scripts/observability/fixtures/phase-b-promotion-fixture.json');
  const promotionFixture = JSON.parse(fs.readFileSync(promotionFixturePath, 'utf8')) as {
    advisoryCandidate: Parameters<typeof evaluatePhaseBPromotion>[0];
  };
  const promotionEvaluation = evaluatePhaseBPromotion(promotionFixture.advisoryCandidate);
  results.push({
    check: 'phase_b_promotion_enforceability',
    pass: promotionEvaluation.enforceable,
    details: promotionEvaluation.enforceable
      ? 'advisory candidate can be promoted'
      : promotionEvaluation.blockingReasons.join('|'),
  });

  const rollbackFixturePath = path.resolve(process.cwd(), 'scripts/observability/fixtures/rollback-boundary-fixture.json');
  const rollbackFixture = JSON.parse(fs.readFileSync(rollbackFixturePath, 'utf8')) as {
    validPlan: Parameters<typeof validateRollbackBoundary>[0];
  };
  const rollbackBoundaryResult = validateRollbackBoundary(rollbackFixture.validPlan, [
    createReliabilityEvent({
      eventName: 'query_request_started',
      requestId: 'req-rollback-1',
      route: '/query',
      reliability: { degraded: false },
    }),
    createReliabilityEvent({
      eventName: 'query_request_completed',
      requestId: 'req-rollback-1',
      route: '/query',
      reliability: { degraded: false, latencyMs: 220 },
    }),
    createReliabilityEvent({
      eventName: 'query_request_degraded',
      requestId: 'req-rollback-2',
      route: '/query',
      reliability: {
        degraded: true,
        retryable: true,
        code: 'UPSTREAM_TEMPORARY_UNAVAILABLE',
      },
    }),
  ]);
  results.push({
    check: 'rollback_boundary_enforcement',
    pass: rollbackBoundaryResult.valid,
    details: rollbackBoundaryResult.valid ? 'rollback boundaries preserved' : rollbackBoundaryResult.errors.join('|'),
  });

  const signoffT11 = path.resolve(process.cwd(), 'docs/observability/signoff-t11-policy-decisions.md');
  const signoffT12 = path.resolve(process.cwd(), 'docs/observability/signoff-t12-drill-evidence.md');
  results.push({
    check: 'manual_signoff_evidence_artifacts',
    pass: fs.existsSync(signoffT11) && fs.existsSync(signoffT12),
    details: 'T11/T12 versioned evidence artifacts must exist',
  });

  writeReport(results);

  if (!results.every((item) => item.pass)) {
    process.exitCode = 1;
  }
}

main();
