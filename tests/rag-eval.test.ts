import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseEvalVariants,
  withEvalVariantEnv,
} from '../scripts/rag-eval-variants';

test('parseEvalVariants defaults to current mode when no compare env is configured', () => {
  const variants = parseEvalVariants(undefined);

  assert.deepEqual(variants.map((variant) => variant.id), ['current']);
});

test('parseEvalVariants defaults to current mode when compare env has no usable values', () => {
  const variants = parseEvalVariants(' ,  , ');

  assert.deepEqual(variants.map((variant) => variant.id), ['current']);
});

test('parseEvalVariants expands all deterministic comparison modes', () => {
  const variants = parseEvalVariants('all');

  assert.deepEqual(variants.map((variant) => variant.id), ['vector', 'hybrid', 'hybrid-rerank']);
});

test('parseEvalVariants preserves requested comparison order', () => {
  const variants = parseEvalVariants('hybrid-rerank, vector, hybrid');

  assert.deepEqual(variants.map((variant) => variant.id), ['hybrid-rerank', 'vector', 'hybrid']);
});

test('parseEvalVariants rejects unknown variants', () => {
  assert.throws(
    () => parseEvalVariants('vector,semantic-only'),
    /Unknown RAG evaluation variant: semantic-only/,
  );
});

test('withEvalVariantEnv applies variant overrides and restores previous env', async () => {
  process.env.RAG_RETRIEVAL_MODE = 'hybrid';
  process.env.RAG_RERANK_ENABLED = 'true';

  const vectorVariant = parseEvalVariants('vector')[0];

  const observed = await withEvalVariantEnv(vectorVariant, async () => ({
    mode: process.env.RAG_RETRIEVAL_MODE,
    rerank: process.env.RAG_RERANK_ENABLED,
  }));

  assert.deepEqual(observed, {
    mode: 'vector',
    rerank: 'false',
  });
  assert.equal(process.env.RAG_RETRIEVAL_MODE, 'hybrid');
  assert.equal(process.env.RAG_RERANK_ENABLED, 'true');
});
