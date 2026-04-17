import assert from 'node:assert/strict';
import test from 'node:test';

import type { InsertResult, SearchResult, VectorStore } from '../services/vector-store.interface';

function createVectorStore(): VectorStore {
  return {
    async searchDocuments() {
      return [] as SearchResult[];
    },
    async insertDocument(): Promise<InsertResult> {
      return { success: true, error: null };
    },
  };
}

const retrievalService = require('../services/retrieval') as typeof import('../services/retrieval');
const aiService = require('../services/ai') as typeof import('../services/ai');
const ragService = require('../services/rag') as typeof import('../services/rag');

test('generateAnswer export remains backward-compatible for callers expecting plain string', async (t) => {
  t.mock.method(aiService, 'generateAnswerWithReliability', async () => ({
    answer: 'string-only',
    attemptsUsed: 1,
    elapsedMs: 10,
  }));

  const answer = await aiService.generateAnswer('ctx', 'q');
  assert.equal(answer, 'string-only');
});

test('returns fallback answer and empty sources when no search results', async (t) => {
  const vectorStore = createVectorStore();
  const searchMock = t.mock.method(retrievalService, 'searchDocuments', async () => [] as SearchResult[]);
  const generateMock = t.mock.method(aiService, 'generateAnswerWithReliability', async () => ({
    answer: 'no-deberia-llamarse',
    attemptsUsed: 1,
    elapsedMs: 1,
  }));

  const result = await ragService.executeRagQuery(vectorStore, 'que dice la documentacion');

  assert.equal(searchMock.mock.callCount(), 1);
  assert.equal(generateMock.mock.callCount(), 0);
  assert.deepEqual(result, {
    answer: 'No encontré documentos relevantes para responder tu pregunta.',
    sources: [],
  });
});

test('builds context from results and delegates answer generation', async (t) => {
  const vectorStore = createVectorStore();
  const searchResults = [
    {
      similarity: 0.95,
      document: {
        id: 1,
        name: 'Arquitectura',
        content: 'Contenido A',
        embedding: [],
        metadata: {},
        created_at: '2026-01-01T00:00:00.000Z',
      },
    },
    {
      similarity: 0.9,
      content: 'Contenido B',
      name: 'Notas',
    },
  ] as unknown as SearchResult[];

  const searchMock = t.mock.method(retrievalService, 'searchDocuments', async () => searchResults);
  const generateMock = t.mock.method(aiService, 'generateAnswerWithReliability', async () => ({
    answer: 'Respuesta final',
    attemptsUsed: 1,
    elapsedMs: 20,
  }));

  const result = await ragService.executeRagQuery(vectorStore, 'resumime esto');

  assert.equal(searchMock.mock.callCount(), 1);
  assert.deepEqual(searchMock.mock.calls[0].arguments, [vectorStore, 'resumime esto', 5]);
  assert.equal(generateMock.mock.callCount(), 1);
  assert.equal(generateMock.mock.calls[0].arguments[0], 'Contenido A\n\nContenido B');
  assert.equal(generateMock.mock.calls[0].arguments[1], 'resumime esto');
  assert.equal(result.answer, 'Respuesta final');
});

test('maps source name and content fallbacks correctly', async (t) => {
  const vectorStore = createVectorStore();
  const searchResults = [
    {
      similarity: 0.97,
      document: {
        id: 1,
        name: 'Doc principal',
        content: 'Contenido principal',
        embedding: [],
        metadata: {},
        created_at: '2026-01-01T00:00:00.000Z',
      },
    },
    {
      similarity: 0.88,
      name: 'Nombre alternativo',
      text: 'Texto alternativo',
    },
    {
      similarity: 0.77,
      title: 'Titulo fallback',
    },
  ] as unknown as SearchResult[];

  t.mock.method(retrievalService, 'searchDocuments', async () => searchResults);
  t.mock.method(aiService, 'generateAnswerWithReliability', async () => ({
    answer: 'ok',
    attemptsUsed: 1,
    elapsedMs: 15,
  }));

  const result = await ragService.executeRagQuery(vectorStore, 'pregunta');

  assert.deepEqual(result.sources, [
    { name: 'Doc principal', content: 'Contenido principal' },
    { name: 'Nombre alternativo', content: 'Texto alternativo' },
    { name: 'Titulo fallback', content: '' },
  ]);
});

test('returns controlled degraded fallback only for transient exhausted when flag enabled', async (t) => {
  const vectorStore = createVectorStore();
  const searchResults = [
    {
      similarity: 0.95,
      document: {
        id: 1,
        name: 'Doc',
        content: 'Contenido',
        embedding: [],
        metadata: {},
        created_at: '2026-01-01T00:00:00.000Z',
      },
    },
  ] as unknown as SearchResult[];

  t.mock.method(retrievalService, 'searchDocuments', async () => searchResults);
  t.mock.method(aiService, 'getReliabilityFlags', () => ({
    retryEnabled: true,
    degradedContractEnabled: true,
    fallbackOnTransientEnabled: true,
    deterministicEvalEnabled: false,
  }));

  const reliability = require('../services/rag-reliability') as typeof import('../services/rag-reliability');
  t.mock.method(aiService, 'generateAnswerWithReliability', async () => {
    throw new reliability.RagReliabilityError('upstream down', {
      errorClass: 'TRANSIENT_EXHAUSTED',
      code: reliability.DEGRADED_CODE,
      retryable: true,
      degraded: true,
      retryAfterMs: 700,
      status: 503,
    });
  });

  const result = await ragService.executeRagQuery(vectorStore, 'pregunta', { requestId: 'req-1' });

  assert.equal(typeof result.answer, 'string');
  assert.deepEqual(result.sources, []);
  assert.equal(result.reliability?.degraded, true);
  assert.equal(result.reliability?.retryable, true);
  assert.equal(result.reliability?.retryAfterMs, 700);
});

test('does not fallback for terminal reliability errors', async (t) => {
  const vectorStore = createVectorStore();
  const searchResults = [
    {
      similarity: 0.95,
      document: {
        id: 1,
        name: 'Doc',
        content: 'Contenido',
        embedding: [],
        metadata: {},
        created_at: '2026-01-01T00:00:00.000Z',
      },
    },
  ] as unknown as SearchResult[];

  t.mock.method(retrievalService, 'searchDocuments', async () => searchResults);
  t.mock.method(aiService, 'getReliabilityFlags', () => ({
    retryEnabled: true,
    degradedContractEnabled: true,
    fallbackOnTransientEnabled: true,
    deterministicEvalEnabled: false,
  }));

  const reliability = require('../services/rag-reliability') as typeof import('../services/rag-reliability');
  t.mock.method(aiService, 'generateAnswerWithReliability', async () => {
    throw new reliability.RagReliabilityError('terminal provider', {
      errorClass: 'TERMINAL_PROVIDER',
      retryable: false,
      degraded: false,
      status: 502,
    });
  });

  await assert.rejects(
    () => ragService.executeRagQuery(vectorStore, 'pregunta', { requestId: 'req-2' }),
    (error: unknown) => {
      const typed = error as { errorClass?: string; degraded?: boolean };
      assert.equal(typed.errorClass, 'TERMINAL_PROVIDER');
      assert.equal(typed.degraded, false);
      return true;
    },
  );
});
