import assert from 'node:assert/strict';
import test from 'node:test';

import { searchDocuments } from '../services/retrieval';
import type { InsertResult, SearchResult, VectorStore } from '../services/vector-store.interface';

function createVectorStore(searchImpl: (query: string, limit: number) => Promise<SearchResult[]>): VectorStore {
  return {
    searchDocuments: searchImpl,
    async insertDocument(): Promise<InsertResult> {
      return { success: true, error: null };
    },
  };
}

test('delegates query and limit to vectorStore.searchDocuments', async (t) => {
  const expectedResults = [{ similarity: 0.9 }] as SearchResult[];
  const vectorStore = createVectorStore(async () => [] as SearchResult[]);

  const searchMock = t.mock.method(vectorStore, 'searchDocuments', async (query: string, limit: number) => {
    assert.equal(query, 'arquitectura hexagonal');
    assert.equal(limit, 3);
    return expectedResults;
  });

  const result = await searchDocuments(vectorStore, 'arquitectura hexagonal', 3);

  assert.equal(searchMock.mock.callCount(), 1);
  assert.deepEqual(searchMock.mock.calls[0].arguments, ['arquitectura hexagonal', 3]);
  assert.deepEqual(result, expectedResults);
});

test('uses default limit of 5 when not provided', async (t) => {
  const vectorStore = createVectorStore(async () => [] as SearchResult[]);

  const searchMock = t.mock.method(vectorStore, 'searchDocuments', async () => [] as SearchResult[]);

  await searchDocuments(vectorStore, 'pregunta sin limite');

  assert.equal(searchMock.mock.callCount(), 1);
  assert.deepEqual(searchMock.mock.calls[0].arguments, ['pregunta sin limite', 5]);
});
