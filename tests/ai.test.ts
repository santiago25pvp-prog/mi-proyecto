import assert from 'node:assert/strict';
import test from 'node:test';

import { GoogleGenerativeAI } from '@google/generative-ai';

process.env.GEMINI_API_KEY ??= 'test-gemini-key';

const aiService = require('../services/ai') as typeof import('../services/ai');

test('classifies provider statuses in reliability classifier boundary', () => {
  const reliability = require('../services/rag-reliability') as typeof import('../services/rag-reliability');

  assert.equal(reliability.classifyProviderError({ status: 429 }), 'TRANSIENT_PROVIDER');
  assert.equal(reliability.classifyProviderError({ status: 500 }), 'TRANSIENT_PROVIDER');
  assert.equal(reliability.classifyProviderError({ status: 503 }), 'TRANSIENT_PROVIDER');

  assert.equal(reliability.classifyProviderError({ status: 400 }), 'TERMINAL_PROVIDER');
  assert.equal(reliability.classifyProviderError({ status: 401 }), 'TERMINAL_PROVIDER');
  assert.equal(reliability.classifyProviderError({ status: 403 }), 'TERMINAL_PROVIDER');
  assert.equal(reliability.classifyProviderError({ status: 404 }), 'TERMINAL_PROVIDER');
  assert.equal(reliability.classifyProviderError({ status: 422 }), 'TERMINAL_PROVIDER');
});

test('loads conservative reliability policy defaults and safe overrides', () => {
  const defaultPolicy = aiService.getReliabilityPolicy({} as NodeJS.ProcessEnv);
  assert.equal(defaultPolicy.maxAttempts, 3);
  assert.equal(defaultPolicy.baseDelayMs, 300);
  assert.equal(defaultPolicy.maxDelayMs, 1200);
  assert.equal(defaultPolicy.maxRetryWindowMs, 2000);
  assert.equal(defaultPolicy.jitterRatio, 0.2);

  const invalidPolicy = aiService.getReliabilityPolicy({
    RAG_RETRY_MAX_ATTEMPTS: 'not-number',
    RAG_RETRY_BASE_DELAY_MS: '-1',
    RAG_RETRY_MAX_DELAY_MS: '0',
    RAG_RETRY_MAX_WINDOW_MS: 'NaN',
    RAG_RETRY_JITTER_RATIO: '5',
  } as NodeJS.ProcessEnv);

  assert.equal(invalidPolicy.maxAttempts, 3);
  assert.equal(invalidPolicy.baseDelayMs, 300);
  assert.equal(invalidPolicy.maxDelayMs, 1200);
  assert.equal(invalidPolicy.maxRetryWindowMs, 2000);
  assert.equal(invalidPolicy.jitterRatio, 1);
});

test('retries transient generation failures with conservative envelope', async (t) => {
  let attempts = 0;
  const delays: number[] = [];

  const restoreSetTimeout = t.mock.method(global, 'setTimeout', ((callback: (...args: any[]) => void, delay?: number, ...args: any[]) => {
    delays.push(Number(delay ?? 0));
    callback(...args);
    return { ref() { return this; }, unref() { return this; } } as unknown as NodeJS.Timeout;
  }) as typeof setTimeout);

  const modelFactoryMock = t.mock.method(
    GoogleGenerativeAI.prototype,
    'getGenerativeModel',
    () => ({
      async generateContent() {
        attempts += 1;
        if (attempts < 3) {
          throw { status: 503, message: 'temporary outage' };
        }

        return {
          response: {
            text() {
              return 'ok';
            },
          },
        };
      },
    }) as unknown as ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  );

  const result = await aiService.generateAnswerWithReliability('ctx', 'q', {
    randomFn: () => 0.5,
    policy: {
      maxAttempts: 3,
      baseDelayMs: 300,
      maxDelayMs: 1200,
      maxRetryWindowMs: 2000,
      jitterRatio: 0.2,
    },
    flags: {
      retryEnabled: true,
      degradedContractEnabled: true,
      fallbackOnTransientEnabled: false,
      deterministicEvalEnabled: true,
    },
  });

  assert.equal(result.answer, 'ok');
  assert.equal(attempts, 3);
  assert.equal(modelFactoryMock.mock.callCount(), 1);
  assert.equal(restoreSetTimeout.mock.callCount(), 2);
  assert.equal(delays.length, 2);
  assert.equal(delays.every((delay) => delay >= 1 && delay <= 1200), true);
});

test('throws transient exhausted when generation retries exceed budget', async (t) => {
  const restoreSetTimeout = t.mock.method(global, 'setTimeout', ((callback: (...args: any[]) => void, _delay?: number, ...args: any[]) => {
    callback(...args);
    return { ref() { return this; }, unref() { return this; } } as unknown as NodeJS.Timeout;
  }) as typeof setTimeout);

  t.mock.method(
    GoogleGenerativeAI.prototype,
    'getGenerativeModel',
    () => ({
      async generateContent() {
        throw { status: 503, message: 'temporary outage' };
      },
    }) as unknown as ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  );

  await assert.rejects(
    () => aiService.generateAnswerWithReliability('ctx', 'q', {
      randomFn: () => 0.5,
      policy: {
        maxAttempts: 3,
        baseDelayMs: 300,
        maxDelayMs: 1200,
        maxRetryWindowMs: 2000,
        jitterRatio: 0.2,
      },
      flags: {
        retryEnabled: true,
        degradedContractEnabled: true,
        fallbackOnTransientEnabled: false,
        deterministicEvalEnabled: true,
      },
    }),
    (error: unknown) => {
      const typed = error as { errorClass?: string; retryable?: boolean; degraded?: boolean };
      assert.equal(typed.errorClass, 'TRANSIENT_EXHAUSTED');
      assert.equal(typed.retryable, true);
      assert.equal(typed.degraded, true);
      return true;
    },
  );

  assert.equal(restoreSetTimeout.mock.callCount(), 2);
});

test('composes prompt with context and question intent', async (t) => {
  let capturedPrompt = '';

  const model = {
    async generateContent(prompt: string) {
      capturedPrompt = prompt;
      return {
        response: {
          text() {
            return 'respuesta';
          },
        },
      };
    },
  };

  const modelFactoryMock = t.mock.method(
    GoogleGenerativeAI.prototype,
    'getGenerativeModel',
    () => model as unknown as ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  );

  const answer = await aiService.generateAnswer('Contexto importante', 'Cual es la idea principal?');

  assert.equal(answer, 'respuesta');
  assert.equal(modelFactoryMock.mock.callCount(), 1);
  assert.match(capturedPrompt, /Contexto:\s*\nContexto importante/);
  assert.match(capturedPrompt, /Pregunta:\s*\nCual es la idea principal\?/);
  assert.match(capturedPrompt, /basándote únicamente en el contexto proporcionado/);
});

test('uses Gemini model and generateContent call path without network', async (t) => {
  const calls: Array<{ stage: string; payload: unknown }> = [];

  const model = {
    async generateContent(prompt: string) {
      calls.push({ stage: 'generateContent', payload: prompt });
      return {
        response: {
          text() {
            return 'respuesta mockeada';
          },
        },
      };
    },
  };

  const modelFactoryMock = t.mock.method(
    GoogleGenerativeAI.prototype,
    'getGenerativeModel',
    (modelConfig: { model: string }) => {
      calls.push({ stage: 'getGenerativeModel', payload: modelConfig });
      return model as unknown as ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
    },
  );

  const result = await aiService.generateAnswer('Bloque de contexto', 'Pregunta puntual');

  assert.equal(result, 'respuesta mockeada');
  assert.equal(modelFactoryMock.mock.callCount(), 1);
  assert.deepEqual(calls[0], {
    stage: 'getGenerativeModel',
    payload: { model: 'gemini-2.5-flash' },
  });
  assert.equal(calls[1]?.stage, 'generateContent');
  assert.equal(typeof calls[1]?.payload, 'string');
});
