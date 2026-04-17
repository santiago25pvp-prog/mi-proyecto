const assert = require('node:assert/strict');
const { mock, test } = require('node:test');

import { emitDegradedTelemetry } from '../lib/reliability-telemetry';

test('emitDegradedTelemetry emits degraded event with requestId via sendBeacon when available', async () => {
  let capturedUrl = '';
  let capturedBodyText = '';

  const originalNavigator = globalThis.navigator;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      sendBeacon(url: string, body: BodyInit | null) {
        capturedUrl = url;
        if (body instanceof Blob) {
          capturedBodyText = '[blob]';
        }
        return true;
      },
    },
  });

  try {
    await emitDegradedTelemetry({
      requestId: 'req-telemetry-frontend-1',
      code: 'UPSTREAM_TEMPORARY_UNAVAILABLE',
      retryable: true,
      retryAfterMs: 900,
      toastShown: true,
      retryActionAvailable: true,
    });

    assert.equal(capturedUrl, '/telemetry/reliability');
    assert.equal(capturedBodyText, '[blob]');
  } finally {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
  }
});

test('emitDegradedTelemetry falls back to keepalive fetch if sendBeacon is unavailable', async () => {
  const originalNavigator = globalThis.navigator;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {},
  });

  const fetchMock = mock.method(globalThis, 'fetch', async () => ({ ok: true } as Response));

  try {
    await emitDegradedTelemetry({
      requestId: 'req-telemetry-frontend-2',
      code: 'UPSTREAM_TEMPORARY_UNAVAILABLE',
      retryable: true,
      retryAfterMs: 500,
      toastShown: true,
      retryActionAvailable: true,
    });

    assert.equal(fetchMock.mock.callCount(), 1);
    const [url, init] = fetchMock.mock.calls[0].arguments as [string, RequestInit];
    assert.equal(url, '/telemetry/reliability');
    assert.equal(init.method, 'POST');
    assert.equal(init.keepalive, true);
  } finally {
    fetchMock.mock.restore();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
  }
});
