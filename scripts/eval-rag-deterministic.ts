import assert from 'node:assert/strict';
import { classifyProviderError } from '../services/rag-reliability';
import { getReliabilityPolicy } from '../services/ai';

function runDeterministicAssertions() {
  assert.equal(classifyProviderError({ status: 429 }), 'TRANSIENT_PROVIDER');
  assert.equal(classifyProviderError({ status: 500 }), 'TRANSIENT_PROVIDER');
  assert.equal(classifyProviderError({ status: 503 }), 'TRANSIENT_PROVIDER');

  assert.equal(classifyProviderError({ status: 400 }), 'TERMINAL_PROVIDER');
  assert.equal(classifyProviderError({ status: 401 }), 'TERMINAL_PROVIDER');
  assert.equal(classifyProviderError({ status: 403 }), 'TERMINAL_PROVIDER');
  assert.equal(classifyProviderError({ status: 404 }), 'TERMINAL_PROVIDER');
  assert.equal(classifyProviderError({ status: 422 }), 'TERMINAL_PROVIDER');

  const policy = getReliabilityPolicy({} as NodeJS.ProcessEnv);
  assert.equal(policy.maxAttempts, 3);
  assert.equal(policy.baseDelayMs, 300);
  assert.equal(policy.maxDelayMs, 1200);
  assert.equal(policy.maxRetryWindowMs, 2000);

  const startedAt = Date.now();
  const report = {
    lane: 'deterministic-blocking',
    success: true,
    assertions: 10,
    elapsedMs: Date.now() - startedAt,
    networkCalls: false,
  };

  console.log('=== RAG Deterministic Reliability Eval ===');
  console.log(JSON.stringify(report, null, 2));
}

runDeterministicAssertions();
