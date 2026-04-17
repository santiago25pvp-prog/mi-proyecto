import assert from 'node:assert/strict';
import test from 'node:test';

import { createReliabilityEvent } from '../../services/observability/event-schema';
import { computeCanonicalSlis } from '../../services/observability/sli-computation';

test('computeCanonicalSlis calculates v1 formulas deterministically', () => {
  const events = [
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
      reliability: { degraded: false, latencyMs: 100 },
    }),
    createReliabilityEvent({
      eventName: 'query_request_started',
      requestId: 'req-2',
      route: '/query',
      reliability: { degraded: false },
    }),
    createReliabilityEvent({
      eventName: 'query_request_degraded',
      requestId: 'req-2',
      route: '/query',
      reliability: { degraded: true, latencyMs: 500 },
    }),
    createReliabilityEvent({
      eventName: 'rag_provider_retry_exhausted',
      requestId: 'req-2',
      route: '/query',
      reliability: { degraded: true, retryable: true },
    }),
  ];

  const result = computeCanonicalSlis(events, {
    startedAt: '2026-04-17T00:00:00.000Z',
    endedAt: '2026-04-17T01:00:00.000Z',
  });

  assert.equal(result.formulaVersion, 'v1');
  assert.equal(result.eligibleQueryRequests, 2);
  assert.equal(result.successfulNonDegraded.numerator, 1);
  assert.equal(result.degradedResponses.numerator, 1);
  assert.equal(result.retryExhaustedProviderCalls.numerator, 1);
  assert.equal(result.retryExhaustedProviderCalls.denominator, 1);
  assert.equal(result.p95LatencyMs.value, 500);
});

test('computeCanonicalSlis marks invalid_for_enforcement on missing required taxonomy', () => {
  const result = computeCanonicalSlis([], {
    startedAt: '2026-04-17T00:00:00.000Z',
    endedAt: '2026-04-17T01:00:00.000Z',
  });

  assert.equal(result.successfulNonDegraded.invalidForEnforcement, true);
  assert.equal(result.degradedResponses.invalidForEnforcement, true);
  assert.equal(result.retryExhaustedProviderCalls.invalidForEnforcement, true);
  assert.equal(result.p95LatencyMs.invalidForEnforcement, true);
  assert.ok(result.integrityFailures.some((item) => item.includes('missing_event_family')));
});
