import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateSloPolicy } from '../../services/observability/slo-policy';
import { SliWindowResult } from '../../services/observability/sli-computation';

function baseResult(): SliWindowResult {
  return {
    formulaVersion: 'v1',
    window: {
      startedAt: '2026-04-17T00:00:00.000Z',
      endedAt: '2026-04-17T01:00:00.000Z',
    },
    eligibleQueryRequests: 100,
    successfulNonDegraded: {
      value: 0.994,
      numerator: 994,
      denominator: 1000,
      invalidForEnforcement: false,
    },
    degradedResponses: {
      value: 0.025,
      numerator: 25,
      denominator: 1000,
      invalidForEnforcement: false,
    },
    retryExhaustedProviderCalls: {
      value: 0.004,
      numerator: 4,
      denominator: 1000,
      invalidForEnforcement: false,
    },
    p95LatencyMs: {
      value: 3100,
      invalidForEnforcement: false,
    },
    classifiedReliabilityErrors: {
      total: 0,
      byCode: {},
    },
    integrityFailures: [],
  };
}

test('warning breaches stay warning when critical is not met', () => {
  const result = baseResult();
  result.degradedResponses.value = 0.03;
  result.successfulNonDegraded.value = 0.996;
  result.p95LatencyMs.value = 3200;

  const evaluation = evaluateSloPolicy(result);

  assert.equal(evaluation.severity, 'warning');
  assert.ok(evaluation.reasons.some((item) => item.includes('warning')));
});

test('critical fast-burn equivalent breaches classify as critical', () => {
  const result = baseResult();
  result.successfulNonDegraded.value = 0.98;

  const evaluation = evaluateSloPolicy(result);

  assert.equal(evaluation.severity, 'critical');
  assert.ok(evaluation.reasons.some((item) => item.includes('critical')));
});
