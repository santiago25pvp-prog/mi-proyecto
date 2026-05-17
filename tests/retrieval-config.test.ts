import assert from 'node:assert/strict';
import test from 'node:test';

import { getRetrievalConfig } from '../services/retrieval-config';

test('uses safe defaults when mode and weights are missing', () => {
  const config = getRetrievalConfig({} as NodeJS.ProcessEnv);

  assert.equal(config.mode, 'vector');
  assert.equal(config.vectorWeight, 0.7);
  assert.equal(config.ftsWeight, 0.3);
  assert.equal(config.rerank.enabled, false);
  assert.equal(config.rerank.overlapWeight, 0.5);
  assert.equal(config.rerank.similarityWeight, 0.4);
  assert.equal(config.rerank.freshnessWeight, 0.1);
});

test('falls back to vector mode when RAG_RETRIEVAL_MODE is invalid', () => {
  const config = getRetrievalConfig({
    RAG_RETRIEVAL_MODE: 'lexical-only',
    RAG_VECTOR_WEIGHT: '0.4',
    RAG_FTS_WEIGHT: '0.6',
  });

  assert.equal(config.mode, 'vector');
  assert.equal(config.vectorWeight, 0.4);
  assert.equal(config.ftsWeight, 0.6);
});

test('normalizes valid configured weights', () => {
  const config = getRetrievalConfig({
    RAG_RETRIEVAL_MODE: 'hybrid',
    RAG_VECTOR_WEIGHT: '2',
    RAG_FTS_WEIGHT: '1',
  });

  assert.equal(config.mode, 'hybrid');
  assert.equal(config.vectorWeight, 2 / 3);
  assert.equal(config.ftsWeight, 1 / 3);
});

test('uses defaults when configured weights are invalid', () => {
  const config = getRetrievalConfig({
    RAG_RETRIEVAL_MODE: 'hybrid',
    RAG_VECTOR_WEIGHT: '-1',
    RAG_FTS_WEIGHT: 'foo',
  });

  assert.equal(config.mode, 'hybrid');
  assert.equal(config.vectorWeight, 0.7);
  assert.equal(config.ftsWeight, 0.3);
});

test('uses defaults when normalized sum is zero', () => {
  const config = getRetrievalConfig({
    RAG_RETRIEVAL_MODE: 'hybrid',
    RAG_VECTOR_WEIGHT: '0',
    RAG_FTS_WEIGHT: '0',
  });

  assert.equal(config.mode, 'hybrid');
  assert.equal(config.vectorWeight, 0.7);
  assert.equal(config.ftsWeight, 0.3);
});

test('enables rerank and normalizes configured rerank weights', () => {
  const config = getRetrievalConfig({
    RAG_RERANK_ENABLED: 'true',
    RAG_RERANK_OVERLAP_WEIGHT: '2',
    RAG_RERANK_SIMILARITY_WEIGHT: '1',
    RAG_RERANK_FRESHNESS_WEIGHT: '1',
  });

  assert.equal(config.rerank.enabled, true);
  assert.equal(config.rerank.overlapWeight, 0.5);
  assert.equal(config.rerank.similarityWeight, 0.25);
  assert.equal(config.rerank.freshnessWeight, 0.25);
});

test('falls back to disabled rerank and default weights when rerank env values are invalid', () => {
  const config = getRetrievalConfig({
    RAG_RERANK_ENABLED: 'sometimes',
    RAG_RERANK_OVERLAP_WEIGHT: '-2',
    RAG_RERANK_SIMILARITY_WEIGHT: 'NaN',
    RAG_RERANK_FRESHNESS_WEIGHT: '0',
  });

  assert.equal(config.rerank.enabled, false);
  assert.equal(config.rerank.overlapWeight, 0.5);
  assert.equal(config.rerank.similarityWeight, 0.4);
  assert.equal(config.rerank.freshnessWeight, 0.1);
});
