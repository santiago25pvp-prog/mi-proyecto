import assert from 'node:assert/strict';
import test from 'node:test';

import { rerankSearchResults } from '../services/retrieval-rerank';
import type { Document, SearchResult } from '../services/vector-store.interface';

function createResult(
  id: number,
  content: string,
  similarity: number,
  createdAt = '2026-01-01T00:00:00.000Z',
): SearchResult {
  return {
    similarity,
    document: {
      id,
      name: `Doc ${id}`,
      content,
      embedding: [],
      metadata: {},
      created_at: createdAt,
    } satisfies Document,
  };
}

const defaultWeights = {
  overlapWeight: 0.5,
  similarityWeight: 0.4,
  freshnessWeight: 0.1,
};

test('promotes documents with stronger query token overlap', () => {
  const results = [
    createResult(1, 'Contenido general sobre arquitectura', 0.95),
    createResult(2, 'JWT auth Supabase tokens y sesiones seguras', 0.6),
  ];

  const reranked = rerankSearchResults('Supabase JWT auth', results, defaultWeights, {
    now: new Date('2026-05-17T00:00:00.000Z'),
  });

  assert.deepEqual(reranked.map((result) => result.document.id), [2, 1]);
});

test('uses similarity when overlap is tied', () => {
  const results = [
    createResult(1, 'Supabase auth', 0.4),
    createResult(2, 'Supabase auth', 0.8),
  ];

  const reranked = rerankSearchResults('Supabase auth', results, defaultWeights, {
    now: new Date('2026-05-17T00:00:00.000Z'),
  });

  assert.deepEqual(reranked.map((result) => result.document.id), [2, 1]);
});

test('uses freshness only for valid dates', () => {
  const results = [
    createResult(1, 'Supabase auth', 0.5, 'not-a-date'),
    createResult(2, 'Supabase auth', 0.5, '2026-05-16T00:00:00.000Z'),
  ];

  const reranked = rerankSearchResults('Supabase auth', results, {
    overlapWeight: 0.4,
    similarityWeight: 0.4,
    freshnessWeight: 0.2,
  }, {
    now: new Date('2026-05-17T00:00:00.000Z'),
  });

  assert.deepEqual(reranked.map((result) => result.document.id), [2, 1]);
});

test('preserves original order when scores tie', () => {
  const results = [
    createResult(1, 'Supabase auth', 0.5, '2026-05-16T00:00:00.000Z'),
    createResult(2, 'Supabase auth', 0.5, '2026-05-16T00:00:00.000Z'),
  ];

  const reranked = rerankSearchResults('Supabase auth', results, defaultWeights, {
    now: new Date('2026-05-17T00:00:00.000Z'),
  });

  assert.deepEqual(reranked.map((result) => result.document.id), [1, 2]);
});
