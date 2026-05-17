import assert from 'node:assert/strict';
import test from 'node:test';

process.env.SUPABASE_URL ??= 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key';
process.env.GEMINI_API_KEY ??= 'test-gemini-key';

const embeddingService = require('../services/embedding') as typeof import('../services/embedding');
const { supabase } = require('../services/vector-db') as typeof import('../services/vector-db');
const loggerService = require('../services/logger') as typeof import('../services/logger');
const { SupabaseVectorAdapter } = require('../services/supabase-vector-adapter') as typeof import('../services/supabase-vector-adapter');

type RpcCall = {
  fn: string;
  args: Record<string, unknown>;
};

function createRpcRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    name: 'Doc',
    content: 'Contenido',
    embedding: [0.1, 0.2],
    metadata: { source: 'test' },
    created_at: '2026-01-01T00:00:00.000Z',
    similarity: 0.88,
    ...overrides,
  };
}

test('uses vector retrieval mode and legacy match_documents RPC', async (t) => {
  process.env.RAG_RETRIEVAL_MODE = 'vector';
  process.env.RAG_VECTOR_WEIGHT = '0.7';
  process.env.RAG_FTS_WEIGHT = '0.3';

  t.mock.method(embeddingService, 'getEmbedding', async () => [0.11, 0.22]);

  const rpcCalls: RpcCall[] = [];
  t.mock.method(supabase, 'rpc', async (fn: string, args: Record<string, unknown>) => {
    rpcCalls.push({ fn, args });
    return { data: [createRpcRow()], error: null };
  });

  const adapter = new SupabaseVectorAdapter();
  const result = await adapter.searchDocuments('consulta vectorial', 3);

  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].fn, 'match_documents');
  assert.equal(rpcCalls[0].args.match_count, 3);
  assert.equal(result.length, 1);
  assert.equal(result[0].similarity, 0.88);
});

test('uses hybrid retrieval mode and weighted match_documents_hybrid RPC', async (t) => {
  process.env.RAG_RETRIEVAL_MODE = 'hybrid';
  process.env.RAG_VECTOR_WEIGHT = '2';
  process.env.RAG_FTS_WEIGHT = '1';

  t.mock.method(embeddingService, 'getEmbedding', async () => [0.33, 0.44]);

  const rpcCalls: RpcCall[] = [];
  t.mock.method(supabase, 'rpc', async (fn: string, args: Record<string, unknown>) => {
    rpcCalls.push({ fn, args });
    return { data: [createRpcRow({ similarity: 0.91 })], error: null };
  });

  const adapter = new SupabaseVectorAdapter();
  const result = await adapter.searchDocuments('consulta hibrida', 5);

  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].fn, 'match_documents_hybrid');
  assert.equal(rpcCalls[0].args.match_count, 5);
  assert.equal(rpcCalls[0].args.vector_weight, 2 / 3);
  assert.equal(rpcCalls[0].args.fts_weight, 1 / 3);
  assert.equal(result[0].similarity, 0.91);
});

test('falls back from hybrid to vector retrieval when hybrid RPC fails', async (t) => {
  process.env.RAG_RETRIEVAL_MODE = 'hybrid';
  process.env.RAG_VECTOR_WEIGHT = '0.8';
  process.env.RAG_FTS_WEIGHT = '0.2';

  t.mock.method(embeddingService, 'getEmbedding', async () => [0.55, 0.66]);

  const telemetryEvents: string[] = [];
  t.mock.method(loggerService, 'logReliabilityEvent', (input: { eventName: string }) => {
    telemetryEvents.push(input.eventName);
  });

  const rpcCalls: RpcCall[] = [];
  t.mock.method(supabase, 'rpc', async (fn: string, args: Record<string, unknown>) => {
    rpcCalls.push({ fn, args });

    if (fn === 'match_documents_hybrid') {
      return { data: null, error: new Error('hybrid function missing') };
    }

    return { data: [createRpcRow({ similarity: 0.76 })], error: null };
  });

  const adapter = new SupabaseVectorAdapter();
  const result = await adapter.searchDocuments('consulta fallback', 4);

  assert.equal(rpcCalls.length, 2);
  assert.equal(rpcCalls[0].fn, 'match_documents_hybrid');
  assert.equal(rpcCalls[1].fn, 'match_documents');
  assert.equal(result[0].similarity, 0.76);
  assert.ok(telemetryEvents.includes('retrieval_mode_selected'));
  assert.ok(telemetryEvents.includes('retrieval_hybrid_fallback_vector'));
});
