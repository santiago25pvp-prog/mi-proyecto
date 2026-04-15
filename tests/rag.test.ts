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

test('returns fallback answer and empty sources when no search results', async (t) => {
  const vectorStore = createVectorStore();
  const searchMock = t.mock.method(retrievalService, 'searchDocuments', async () => [] as SearchResult[]);
  const generateMock = t.mock.method(aiService, 'generateAnswer', async () => 'no-deberia-llamarse');

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
  const generateMock = t.mock.method(aiService, 'generateAnswer', async () => 'Respuesta final');

  const result = await ragService.executeRagQuery(vectorStore, 'resumime esto');

  assert.equal(searchMock.mock.callCount(), 1);
  assert.deepEqual(searchMock.mock.calls[0].arguments, [vectorStore, 'resumime esto', 5]);
  assert.equal(generateMock.mock.callCount(), 1);
  assert.deepEqual(generateMock.mock.calls[0].arguments, ['Contenido A\n\nContenido B', 'resumime esto']);
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
  t.mock.method(aiService, 'generateAnswer', async () => 'ok');

  const result = await ragService.executeRagQuery(vectorStore, 'pregunta');

  assert.deepEqual(result.sources, [
    { name: 'Doc principal', content: 'Contenido principal' },
    { name: 'Nombre alternativo', content: 'Texto alternativo' },
    { name: 'Titulo fallback', content: '' },
  ]);
});
