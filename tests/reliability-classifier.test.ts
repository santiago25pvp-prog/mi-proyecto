import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyProviderError,
  clampRetryAfterMs,
  extractRetryHintMs,
  type RetryPolicy,
} from '../services/rag-reliability';

const policy: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 300,
  maxDelayMs: 1200,
  maxRetryWindowMs: 2000,
  jitterRatio: 0.2,
};

test('classifies provider boundary statuses', () => {
  assert.equal(classifyProviderError({ status: 429 }), 'TRANSIENT_PROVIDER');
  assert.equal(classifyProviderError({ status: 500 }), 'TRANSIENT_PROVIDER');
  assert.equal(classifyProviderError({ status: 503 }), 'TRANSIENT_PROVIDER');

  assert.equal(classifyProviderError({ status: 400 }), 'TERMINAL_PROVIDER');
  assert.equal(classifyProviderError({ status: 401 }), 'TERMINAL_PROVIDER');
  assert.equal(classifyProviderError({ status: 403 }), 'TERMINAL_PROVIDER');
  assert.equal(classifyProviderError({ status: 404 }), 'TERMINAL_PROVIDER');
  assert.equal(classifyProviderError({ status: 422 }), 'TERMINAL_PROVIDER');
});

test('extracts retry hint and clamps retryAfter', () => {
  const hint = extractRetryHintMs({ message: 'Please retry in 2.5s' });
  assert.equal(hint, 2500);
  assert.equal(clampRetryAfterMs(hint ?? 0, policy), 1200);
  assert.equal(clampRetryAfterMs(10, policy), 300);
});
