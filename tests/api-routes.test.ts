import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

process.env.GEMINI_API_KEY ??= 'test-gemini-key';
process.env.SUPABASE_URL ??= 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key';

const ragModule = require('../controllers/rag') as typeof import('../controllers/rag');
const ragService = require('../services/rag') as typeof import('../services/rag');
const apiModule = require('../controllers/api') as typeof import('../controllers/api');
const { supabase } = require('../services/vector-db') as typeof import('../services/vector-db');
const retrievalService = require('../services/retrieval') as typeof import('../services/retrieval');
const ingestionService = require('../services/ingestion') as typeof import('../services/ingestion');
const scraperService = require('../services/scraper') as typeof import('../services/scraper');
const splitterService = require('../services/splitter') as typeof import('../services/splitter');
const embeddingService = require('../services/embedding') as typeof import('../services/embedding');
const { createApp: buildApp } = require('../server') as typeof import('../server');

const { chatHandler } = ragModule;
const { ingestHandler, queryHandler } = apiModule;

type RestoreFn = () => void;
type AuthResult = Promise<{ data: { user: any }; error: any }>;

async function startServer() {
  return await new Promise<{ server: http.Server; baseUrl: string }>((resolve) => {
    const server = buildApp().listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
      });
    });
  });
}

async function stopServer(server: http.Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function restoreAll(restores: RestoreFn[]) {
  for (const restore of restores.reverse()) {
    restore();
  }
}

function mockGetUser(
  implementation: (token: string) => AuthResult,
): RestoreFn {
  const original = supabase.auth.getUser.bind(supabase.auth);
  supabase.auth.getUser = implementation as typeof supabase.auth.getUser;

  return () => {
    supabase.auth.getUser = original;
  };
}

function mockExecuteRagQuery(
  implementation: typeof ragService.executeRagQuery,
): RestoreFn {
  const original = ragService.executeRagQuery;
  (ragService as any).executeRagQuery = implementation;

  return () => {
    (ragService as any).executeRagQuery = original;
  };
}

function mockIngestUrl(
  implementation: typeof ingestionService.ingestUrl,
): RestoreFn {
  const original = ingestionService.ingestUrl;
  (ingestionService as any).ingestUrl = implementation;

  return () => {
    (ingestionService as any).ingestUrl = original;
  };
}

function mockSearchDocuments(
  implementation: typeof retrievalService.searchDocuments,
): RestoreFn {
  const original = retrievalService.searchDocuments;
  (retrievalService as any).searchDocuments = implementation;

  return () => {
    (retrievalService as any).searchDocuments = original;
  };
}

function mockDocumentLoader(
  implementation: typeof scraperService.documentLoader,
): RestoreFn {
  const original = scraperService.documentLoader;
  (scraperService as any).documentLoader = implementation;

  return () => {
    (scraperService as any).documentLoader = original;
  };
}

function mockTextSplitter(
  implementation: typeof splitterService.textSplitter,
): RestoreFn {
  const original = splitterService.textSplitter;
  (splitterService as any).textSplitter = implementation;

  return () => {
    (splitterService as any).textSplitter = original;
  };
}

function mockGetEmbedding(
  implementation: typeof embeddingService.getEmbedding,
): RestoreFn {
  const original = embeddingService.getEmbedding;
  (embeddingService as any).getEmbedding = implementation;

  return () => {
    (embeddingService as any).getEmbedding = original;
  };
}

function mockSupabaseInsert(
  implementation: (table: string, values: any) => Promise<{ data: any; error: any }>,
): RestoreFn {
  const original = supabase.from.bind(supabase);
  supabase.from = ((table: string) => ({
    insert: (values: any) => implementation(table, values),
  })) as unknown as typeof supabase.from;

  return () => {
    supabase.from = original;
  };
}

function mockSupabaseFrom(
  implementation: (table: string) => any,
): RestoreFn {
  const original = supabase.from.bind(supabase);
  supabase.from = implementation as typeof supabase.from;

  return () => {
    supabase.from = original;
  };
}

function mockGenerativeModel(
  implementation: (options: { model: string }) => { generateContent: (prompt: string) => Promise<any> },
): RestoreFn {
  const original = GoogleGenerativeAI.prototype.getGenerativeModel;
  GoogleGenerativeAI.prototype.getGenerativeModel = implementation as typeof GoogleGenerativeAI.prototype.getGenerativeModel;

  return () => {
    GoogleGenerativeAI.prototype.getGenerativeModel = original;
  };
}

function validUser(id: string) {
  return {
    id,
    app_metadata: { role: 'user' },
  };
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function postJson(baseUrl: string, path: string, body: unknown, token?: string) {
  return await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: token ? authHeaders(token) : { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const protectedRoutes = [
  {
    name: '/chat',
    path: '/chat',
    body: { query: 'hola' },
    mockSuccess: () => [
      mockSearchDocuments(async () => []),
    ],
  },
  {
    name: '/ingest',
    path: '/ingest',
    body: { url: 'https://example.com' },
    mockSuccess: () => [
      mockIngestUrl(async () => ({
        status: 'success',
        chunks_inserted: 1,
        chunks_failed: 0,
      })),
    ],
  },
  {
    name: '/query',
    path: '/query',
    body: { query: 'hola' },
    mockSuccess: () => [
      mockExecuteRagQuery(async () => ({
        answer: 'respuesta',
        sources: [],
      })),
    ],
  },
] as const;

test('protected API routes enforce authentication and authenticated rate limits', async (t) => {
  for (const route of protectedRoutes) {
    await t.test(`${route.name} returns 401 when bearer token is missing`, async () => {
      const { server, baseUrl } = await startServer();

      try {
        const response = await postJson(baseUrl, route.path, route.body);

        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), {
          error: 'Unauthorized: Missing or invalid token',
        });
      } finally {
        await stopServer(server);
      }
    });

    await t.test(`${route.name} returns 401 when token is invalid`, async () => {
      const restores = [
        mockGetUser(async () => ({
          data: { user: null },
          error: { message: 'invalid token' },
        })),
      ];

      const { server, baseUrl } = await startServer();

      try {
        const response = await postJson(baseUrl, route.path, route.body, 'invalid-token');

        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), {
          error: 'Unauthorized: Invalid token',
        });
      } finally {
        restoreAll(restores);
        await stopServer(server);
      }
    });

    await t.test(`${route.name} returns 500 when auth provider throws`, async () => {
      const restores = [
        mockGetUser(async () => {
          throw new Error('auth provider unavailable');
        }),
      ];

      const { server, baseUrl } = await startServer();

      try {
        const response = await postJson(baseUrl, route.path, route.body, 'broken-token');

        assert.equal(response.status, 500);
        assert.deepEqual(await response.json(), {
          error: 'Internal Server Error during authentication',
        });
      } finally {
        restoreAll(restores);
        await stopServer(server);
      }
    });

    await t.test(`${route.name} rate limits by authenticated user id`, async () => {
      const userAToken = `${route.path}-user-a`;
      const userBToken = `${route.path}-user-b`;
      const restores = [
        mockGetUser(async (token) => ({
          data: {
            user: validUser(token === userAToken ? `${route.path}-user-a` : `${route.path}-user-b`),
          },
          error: null,
        })),
        ...route.mockSuccess(),
      ];

      const { server, baseUrl } = await startServer();

      try {
        for (let index = 0; index < 50; index += 1) {
          const response = await postJson(baseUrl, route.path, route.body, userAToken);
          assert.equal(response.status, 200);
        }

        const limitedResponse = await postJson(baseUrl, route.path, route.body, userAToken);
        assert.equal(limitedResponse.status, 429);
        assert.match(await limitedResponse.text(), /Demasiadas solicitudes autenticadas/);

        const otherUserResponse = await postJson(baseUrl, route.path, route.body, userBToken);
        assert.equal(otherUserResponse.status, 200);
      } finally {
        restoreAll(restores);
        await stopServer(server);
      }
    });
  }
});

test('/chat route responses', async (t) => {
  await t.test('returns 400 when query is missing', async () => {
    const restores = [
      mockGetUser(async () => ({
        data: { user: validUser('chat-missing-query') },
        error: null,
      })),
    ];

    const { server, baseUrl } = await startServer();

    try {
      const response = await postJson(baseUrl, '/chat', {}, 'chat-missing-query-token');

      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: 'Invalid request',
        details: ['Query is required'],
      });
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });

  await t.test('returns answer and sources when RAG succeeds', async () => {
    let capturedPrompt = '';
    const restores = [
      mockGetUser(async () => ({
        data: { user: validUser('chat-success') },
        error: null,
      })),
      mockSearchDocuments(async () => [
        { title: 'Guia', text: 'Contexto uno' },
        { name: 'Manual', content: 'Contexto dos' },
      ] as any),
      mockGenerativeModel(() => ({
        generateContent: async (prompt: string) => {
          capturedPrompt = prompt;
          return {
            response: {
              text: () => 'Respuesta generada',
            },
          };
        },
      })),
    ];

    const { server, baseUrl } = await startServer();

    try {
      const response = await postJson(baseUrl, '/chat', { query: 'Que dice la guia?' }, 'chat-success-token');

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        answer: 'Respuesta generada',
        sources: [
          { name: 'Guia', content: 'Contexto uno' },
          { name: 'Manual', content: 'Contexto dos' },
        ],
      });
      assert.match(capturedPrompt, /Contexto uno/);
      assert.match(capturedPrompt, /Contexto dos/);
      assert.match(capturedPrompt, /Que dice la guia\?/);
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });

  await t.test('returns fallback answer and skips Gemini when no documents are found', async () => {
    let geminiCalled = false;
    const restores = [
      mockGetUser(async () => ({
        data: { user: validUser('chat-fallback') },
        error: null,
      })),
      mockSearchDocuments(async () => []),
      mockGenerativeModel(() => {
        geminiCalled = true;
        throw new Error('Gemini should not be called without context');
      }),
    ];

    const { server, baseUrl } = await startServer();

    try {
      const response = await postJson(baseUrl, '/chat', { query: 'sin contexto' }, 'chat-fallback-token');

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        answer: 'No encontré documentos relevantes para responder tu pregunta.',
        sources: [],
      });
      assert.equal(geminiCalled, false);
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });

  await t.test('returns 500 when document retrieval fails', async () => {
    const restores = [
      mockGetUser(async () => ({
        data: { user: validUser('chat-retrieval-error') },
        error: null,
      })),
      mockSearchDocuments(async () => {
        throw new Error('retrieval failed');
      }),
    ];

    const { server, baseUrl } = await startServer();

    try {
      const response = await postJson(baseUrl, '/chat', { query: 'fallo' }, 'chat-retrieval-error-token');

      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        error: 'Internal Server Error',
      });
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });

  await t.test('returns 500 when Gemini generation fails', async () => {
    const restores = [
      mockGetUser(async () => ({
        data: { user: validUser('chat-gemini-error') },
        error: null,
      })),
      mockSearchDocuments(async () => [
        { content: 'Contexto disponible' },
      ] as any),
      mockGenerativeModel(() => ({
        generateContent: async () => {
          throw new Error('Gemini failed');
        },
      })),
    ];

    const { server, baseUrl } = await startServer();

    try {
      const response = await postJson(baseUrl, '/chat', { query: 'fallo gemini' }, 'chat-gemini-error-token');

      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        error: 'Internal Server Error',
      });
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });
});

test('/health route responses', async (t) => {
  await t.test('returns dependency status when Supabase responds', async () => {
    const restores = [
      mockSupabaseFrom((table: string) => ({
        select: () => ({
          limit: async () => {
            assert.equal(table, 'documents');
            return { data: [], error: null };
          },
        }),
      })),
    ];

    const { server, baseUrl } = await startServer();

    try {
      const response = await fetch(`${baseUrl}/health`);

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        status: 'ok',
        dependencies: { supabase: 'ok' },
      });
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });

  await t.test('returns 500 when dependency check fails', async () => {
    const restores = [
      mockSupabaseFrom(() => ({
        select: () => ({
          limit: async () => ({
            data: null,
            error: { message: 'supabase down' },
          }),
        }),
      })),
    ];

    const { server, baseUrl } = await startServer();

    try {
      const response = await fetch(`${baseUrl}/health`);

      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        error: 'Internal Server Error',
      });
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });
});

test('unknown routes return JSON 404s', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/missing-route`);

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: 'Not Found',
    });
  } finally {
    await stopServer(server);
  }
});

test('/query route responses', async (t) => {
  await t.test('returns 400 when query is missing', async () => {
    const restores = [
      mockGetUser(async () => ({
        data: { user: validUser('query-missing') },
        error: null,
      })),
    ];

    const { server, baseUrl } = await startServer();

    try {
      const response = await postJson(baseUrl, '/query', {}, 'query-missing-token');

      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: 'Invalid request',
        details: ['Query is required'],
      });
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });

  await t.test('returns the direct { answer, sources } shape on success', async () => {
    const restores = [
      mockGetUser(async () => ({
        data: { user: validUser('query-success') },
        error: null,
      })),
      mockExecuteRagQuery(async () => ({
        answer: 'Respuesta consolidada',
        sources: [
          { name: 'Manual', content: 'Contenido' },
        ],
      })),
    ];

    const { server, baseUrl } = await startServer();

    try {
      const response = await postJson(baseUrl, '/query', { query: 'consulta' }, 'query-success-token');

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        answer: 'Respuesta consolidada',
        sources: [
          { name: 'Manual', content: 'Contenido' },
        ],
      });
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });

  await t.test('returns the fallback { answer, sources } shape without wrapper', async () => {
    const restores = [
      mockGetUser(async () => ({
        data: { user: validUser('query-fallback') },
        error: null,
      })),
      mockExecuteRagQuery(async () => ({
        answer: 'No encontré documentos relevantes para responder tu pregunta.',
        sources: [],
      })),
    ];

    const { server, baseUrl } = await startServer();

    try {
      const response = await postJson(baseUrl, '/query', { query: 'sin datos' }, 'query-fallback-token');

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        answer: 'No encontré documentos relevantes para responder tu pregunta.',
        sources: [],
      });
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });

  await t.test('returns 500 when ragQuery throws', async () => {
    const restores = [
      mockGetUser(async () => ({
        data: { user: validUser('query-error') },
        error: null,
      })),
      mockExecuteRagQuery(async () => {
        throw new Error('ragQuery failed');
      }),
    ];

    const { server, baseUrl } = await startServer();

    try {
      const response = await postJson(baseUrl, '/query', { query: 'explode' }, 'query-error-token');

      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        error: 'Internal Server Error',
      });
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });
});

test('/ingest route responses', async (t) => {
  await t.test('returns 400 when url is missing', async () => {
    const restores = [
      mockGetUser(async () => ({
        data: { user: validUser('ingest-missing') },
        error: null,
      })),
    ];

    const { server, baseUrl } = await startServer();

    try {
      const response = await postJson(baseUrl, '/ingest', {}, 'ingest-missing-token');

      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: 'Invalid request',
        details: ['URL is required'],
      });
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });

  await t.test('returns 400 when url is not http or https', async () => {
    const restores = [
      mockGetUser(async () => ({
        data: { user: validUser('ingest-invalid') },
        error: null,
      })),
    ];

    const { server, baseUrl } = await startServer();

    try {
      const response = await postJson(baseUrl, '/ingest', { url: 'ftp://example.com' }, 'ingest-invalid-token');

      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: 'Invalid request',
        details: ['url must be a valid http or https URL'],
      });
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });

  await t.test('returns success counts when every chunk is inserted', async () => {
    const insertedPayloads: any[] = [];
    const restores = [
      mockGetUser(async () => ({
        data: { user: validUser('ingest-success') },
        error: null,
      })),
      mockDocumentLoader(async () => 'raw document text'),
      mockTextSplitter(() => ['chunk-1', 'chunk-2']),
      mockGetEmbedding(async (chunk: string) => [chunk.length, 1]),
      mockSupabaseInsert(async (table, values) => {
        insertedPayloads.push({ table, values });
        return { data: { id: insertedPayloads.length }, error: null };
      }),
    ];

    const { server, baseUrl } = await startServer();

    try {
      const response = await postJson(baseUrl, '/ingest', { url: 'https://example.com/docs' }, 'ingest-success-token');

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        status: 'success',
        chunks_inserted: 2,
        chunks_failed: 0,
      });
      assert.deepEqual(insertedPayloads, [
        {
          table: 'documents',
          values: {
            content: 'chunk-1',
            embedding: [7, 1],
            metadata: { url: 'https://example.com/docs' },
          },
        },
        {
          table: 'documents',
          values: {
            content: 'chunk-2',
            embedding: [7, 1],
            metadata: { url: 'https://example.com/docs' },
          },
        },
      ]);
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });

  await t.test('returns partial_success when some chunk inserts fail', async () => {
    let insertCount = 0;
    const restores = [
      mockGetUser(async () => ({
        data: { user: validUser('ingest-partial') },
        error: null,
      })),
      mockDocumentLoader(async () => 'raw document text'),
      mockTextSplitter(() => ['chunk-1', 'chunk-2']),
      mockGetEmbedding(async () => [1, 2, 3]),
      mockSupabaseInsert(async () => {
        insertCount += 1;

        return insertCount === 1
          ? { data: { id: 1 }, error: null }
          : { data: null, error: { message: 'insert failed' } };
      }),
    ];

    const { server, baseUrl } = await startServer();

    try {
      const response = await postJson(baseUrl, '/ingest', { url: 'https://example.com/partial' }, 'ingest-partial-token');

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        status: 'partial_success',
        chunks_inserted: 1,
        chunks_failed: 1,
      });
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });

  await t.test('returns zero counts when the scraper yields no text chunks', async () => {
    let embeddingCalls = 0;
    const restores = [
      mockGetUser(async () => ({
        data: { user: validUser('ingest-empty') },
        error: null,
      })),
      mockDocumentLoader(async () => ''),
      mockTextSplitter(() => []),
      mockGetEmbedding(async () => {
        embeddingCalls += 1;
        return [1];
      }),
    ];

    const { server, baseUrl } = await startServer();

    try {
      const response = await postJson(baseUrl, '/ingest', { url: 'https://example.com/empty' }, 'ingest-empty-token');

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        status: 'success',
        chunks_inserted: 0,
        chunks_failed: 0,
      });
      assert.equal(embeddingCalls, 0);
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });

  await t.test('returns 500 when the scraper fails', async () => {
    const restores = [
      mockGetUser(async () => ({
        data: { user: validUser('ingest-scraper-error') },
        error: null,
      })),
      mockDocumentLoader(async () => {
        throw new Error('scraper failed');
      }),
    ];

    const { server, baseUrl } = await startServer();

    try {
      const response = await postJson(baseUrl, '/ingest', { url: 'https://example.com/fail' }, 'ingest-scraper-error-token');

      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        error: 'Failed to ingest URL',
      });
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });

  await t.test('returns 500 when embedding generation fails', async () => {
    const restores = [
      mockGetUser(async () => ({
        data: { user: validUser('ingest-embedding-error') },
        error: null,
      })),
      mockDocumentLoader(async () => 'raw document text'),
      mockTextSplitter(() => ['chunk-1']),
      mockGetEmbedding(async () => {
        throw new Error('embedding failed');
      }),
    ];

    const { server, baseUrl } = await startServer();

    try {
      const response = await postJson(baseUrl, '/ingest', { url: 'https://example.com/embed' }, 'ingest-embedding-error-token');

      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        error: 'Failed to ingest URL',
      });
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });

  await t.test('returns 500 when a malformed URL causes scraping to fail', async () => {
    const restores = [
      mockGetUser(async () => ({
        data: { user: validUser('ingest-invalid-url') },
        error: null,
      })),
      mockDocumentLoader(async (url: string) => {
        assert.equal(url, 'not-a-url');
        throw new Error('Invalid URL');
      }),
    ];

    const { server, baseUrl } = await startServer();

    try {
      const response = await postJson(baseUrl, '/ingest', { url: 'not-a-url' }, 'ingest-invalid-url-token');

      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: 'Invalid request',
        details: ['url must be a valid http or https URL'],
      });
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });
});
