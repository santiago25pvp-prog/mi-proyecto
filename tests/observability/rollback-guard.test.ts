import assert from 'node:assert/strict';
import test from 'node:test';

import { createReliabilityEvent } from '../../services/observability/event-schema';
import { validateRollbackBoundary } from '../../services/observability/rollback-guard';

function sampleEvents() {
  return [
    createReliabilityEvent({
      eventName: 'query_request_started',
      requestId: 'rollback-req-1',
      route: '/query',
      reliability: { degraded: false },
    }),
    createReliabilityEvent({
      eventName: 'query_request_completed',
      requestId: 'rollback-req-1',
      route: '/query',
      reliability: { degraded: false, latencyMs: 140 },
    }),
    createReliabilityEvent({
      eventName: 'query_request_degraded',
      requestId: 'rollback-req-2',
      route: '/query',
      reliability: { degraded: true, retryable: true, code: 'UPSTREAM_TEMPORARY_UNAVAILABLE' },
    }),
  ];
}

test('validateRollbackBoundary accepts rollback plans preserving visibility minimums', () => {
  const result = validateRollbackBoundary(
    {
      telemetry: {
        source: 'logs',
        preserveDegradedSemantics: true,
        preserveRequestIdCorrelation: true,
        preserveStructuralEventIntegrity: true,
      },
      alerts: {
        warningEnabled: true,
        criticalEnabled: true,
      },
      governance: {
        structuralBlockingEnabled: true,
        operationalAdvisoryEnabled: true,
      },
    },
    sampleEvents(),
  );

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('validateRollbackBoundary rejects rollback plans that remove minimum visibility', () => {
  const result = validateRollbackBoundary(
    {
      telemetry: {
        source: 'metrics',
        preserveDegradedSemantics: false,
        preserveRequestIdCorrelation: false,
        preserveStructuralEventIntegrity: false,
      },
      alerts: {
        warningEnabled: true,
        criticalEnabled: false,
      },
      governance: {
        structuralBlockingEnabled: false,
        operationalAdvisoryEnabled: true,
      },
    },
    sampleEvents(),
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('rollback_boundary:degraded_semantics_must_be_preserved'));
  assert.ok(result.errors.includes('rollback_boundary:request_id_correlation_must_be_preserved'));
  assert.ok(result.errors.includes('rollback_boundary:critical_coverage_must_remain_enabled'));
});
