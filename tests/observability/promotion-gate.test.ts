import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluatePhaseBPromotion,
  PHASE_B_PROMOTION_POLICY,
} from '../../services/observability/promotion-gate';
import { SliWindowResult } from '../../services/observability/sli-computation';

function baseLogDerived(): SliWindowResult {
  return {
    formulaVersion: 'v1',
    window: {
      startedAt: '2026-04-17T00:00:00.000Z',
      endedAt: '2026-04-17T01:00:00.000Z',
    },
    eligibleQueryRequests: 1000,
    successfulNonDegraded: {
      value: 0.996,
      numerator: 996,
      denominator: 1000,
      invalidForEnforcement: false,
    },
    degradedResponses: {
      value: 0.016,
      numerator: 16,
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
      value: 2900,
      invalidForEnforcement: false,
    },
    classifiedReliabilityErrors: {
      total: 1,
      byCode: {
        UPSTREAM_TEMPORARY_UNAVAILABLE: 1,
      },
    },
    integrityFailures: [],
  };
}

test('phase B promotion becomes enforceable when parity criteria pass', () => {
  const evaluation = evaluatePhaseBPromotion(
    {
      mode: 'enforced',
      releaseCyclesObserved: 1,
      unresolvedTelemetryIntegrityDefects: 0,
      alertNoiseReviewApproved: true,
      windows: [
        {
          id: 'window-pass',
          logDerived: baseLogDerived(),
          explicitMetrics: {
            availability: 0.995,
            degradedResponseRate: 0.017,
            retryExhaustionRate: 0.005,
            p95LatencyMs: 2980,
          },
        },
      ],
    },
    PHASE_B_PROMOTION_POLICY,
  );

  assert.equal(evaluation.enforceable, true);
  assert.equal(evaluation.promoted, true);
  assert.equal(evaluation.blockingReasons.length, 0);
  assert.equal(evaluation.parityByWindow[0]?.pass, true);
});

test('phase B promotion is blocked when parity drifts outside tolerance', () => {
  const evaluation = evaluatePhaseBPromotion(
    {
      mode: 'enforced',
      releaseCyclesObserved: 1,
      unresolvedTelemetryIntegrityDefects: 0,
      alertNoiseReviewApproved: true,
      windows: [
        {
          id: 'window-fail',
          logDerived: baseLogDerived(),
          explicitMetrics: {
            availability: 0.990,
            degradedResponseRate: 0.027,
            retryExhaustionRate: 0.010,
            p95LatencyMs: 3300,
          },
        },
      ],
    },
    PHASE_B_PROMOTION_POLICY,
  );

  assert.equal(evaluation.enforceable, false);
  assert.equal(evaluation.promoted, false);
  assert.ok(evaluation.blockingReasons.includes('promotion_blocked:parity_outside_tolerance'));
});
