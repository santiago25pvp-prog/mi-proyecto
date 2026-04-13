import assert from 'node:assert/strict';
import test from 'node:test';
import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from '@google/generative-ai';

process.env.GEMINI_API_KEY ??= 'test-gemini-key';

const embeddingService = require('../services/embedding') as typeof import('../services/embedding');

type RestoreFn = () => void;

function mockGenerativeModel(
  implementation: (options: { model: string }) => { embedContent: (input: unknown) => Promise<any> },
): RestoreFn {
  const original = GoogleGenerativeAI.prototype.getGenerativeModel;
  GoogleGenerativeAI.prototype.getGenerativeModel = implementation as typeof GoogleGenerativeAI.prototype.getGenerativeModel;

  return () => {
    GoogleGenerativeAI.prototype.getGenerativeModel = original;
  };
}

function mockSetTimeout(recordedDelays: number[]): RestoreFn {
  const original = global.setTimeout;
  global.setTimeout = ((callback: (...args: any[]) => void, delay?: number, ...args: any[]) => {
    recordedDelays.push(Number(delay ?? 0));
    callback(...args);
    return { ref() { return this; }, unref() { return this; } } as NodeJS.Timeout;
  }) as typeof setTimeout;

  return () => {
    global.setTimeout = original;
  };
}

test('retries transient fetch errors for status 429, 500, and 503', async () => {
  for (const status of [429, 500, 503]) {
    let attempts = 0;
    const delays: number[] = [];

    const restoreTimeout = mockSetTimeout(delays);
    const restoreModel = mockGenerativeModel(() => ({
      embedContent: async () => {
        attempts += 1;

        if (attempts < 3) {
          throw new GoogleGenerativeAIFetchError('temporary error', status, 'Transient');
        }

        return {
          embedding: {
            values: new Array(embeddingService.GEMINI_EMBEDDING_DIMENSIONS).fill(0.1),
          },
        };
      },
    }));

    try {
      const uniqueText = `retry-status-${status}-${Date.now()}-${Math.random()}`;
      const result = await embeddingService.getEmbedding(uniqueText);
      assert.equal(result.length, embeddingService.GEMINI_EMBEDDING_DIMENSIONS);
      assert.equal(attempts, 3);
      assert.deepEqual(delays, [6000, 12000]);
    } finally {
      restoreModel();
      restoreTimeout();
    }
  }
});

test('does not retry non-transient errors', async () => {
  let attempts = 0;
  const delays: number[] = [];

  const restoreTimeout = mockSetTimeout(delays);
  const restoreModel = mockGenerativeModel(() => ({
    embedContent: async () => {
      attempts += 1;
      throw new GoogleGenerativeAIFetchError('bad request', 400, 'Bad Request');
    },
  }));

  try {
    const uniqueText = `non-retry-400-${Date.now()}-${Math.random()}`;
    await assert.rejects(() => embeddingService.getEmbedding(uniqueText));
    assert.equal(attempts, 1);
    assert.deepEqual(delays, []);
  } finally {
    restoreModel();
    restoreTimeout();
  }
});

test('stops after five attempts for persistent transient failures', async () => {
  let attempts = 0;
  const delays: number[] = [];

  const restoreTimeout = mockSetTimeout(delays);
  const restoreModel = mockGenerativeModel(() => ({
    embedContent: async () => {
      attempts += 1;
      throw { status: 500, message: 'internal error' };
    },
  }));

  try {
    const uniqueText = `retry-max-attempts-${Date.now()}-${Math.random()}`;
    await assert.rejects(() => embeddingService.getEmbedding(uniqueText));
    assert.equal(attempts, 5);
    assert.deepEqual(delays, [6000, 12000, 24000, 48000]);
  } finally {
    restoreModel();
    restoreTimeout();
  }
});
