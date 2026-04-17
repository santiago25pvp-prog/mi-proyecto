import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createReliabilityEvent,
  validateReliabilityEvent,
} from '../../services/observability/event-schema';

test('createReliabilityEvent emits canonical v1 envelope', () => {
  const event = createReliabilityEvent({
    eventName: 'query_request_completed',
    requestId: 'req-1',
    route: '/query',
    reliability: {
      degraded: false,
      latencyMs: 120,
    },
  });

  assert.equal(event.schemaVersion, 'v1');
  assert.equal(event.eventName, 'query_request_completed');
  assert.equal(event.requestId, 'req-1');
  assert.equal(event.route, '/query');
  assert.equal(typeof event.release, 'string');
});

test('validateReliabilityEvent rejects malformed payloads', () => {
  const validation = validateReliabilityEvent({
    schemaVersion: 'v1',
    eventName: 'query_request_started',
    eventTs: 'not-a-date',
    requestId: '',
    route: '/query',
    release: '',
    reliability: {},
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.length > 0);
});
