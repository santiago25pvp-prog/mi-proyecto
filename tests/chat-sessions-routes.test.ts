import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import test from 'node:test';

process.env.GEMINI_API_KEY ??= 'test-gemini-key';
process.env.SUPABASE_URL ??= 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key';

const chatSessions = require('../services/chat-sessions') as typeof import('../services/chat-sessions');
const { supabase } = require('../services/vector-db') as typeof import('../services/vector-db');
const { createApp: buildApp } = require('../server') as typeof import('../server');

type RestoreFn = () => void;
type AuthResult = Promise<{ data: { user: any }; error: any }>;

async function startServer() {
  return await new Promise<{ server: http.Server; baseUrl: string }>((resolve) => {
    const server = buildApp().listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
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

function mockGetUser(implementation: (token: string) => AuthResult): RestoreFn {
  const original = supabase.auth.getUser.bind(supabase.auth);
  supabase.auth.getUser = implementation as typeof supabase.auth.getUser;

  return () => {
    supabase.auth.getUser = original;
  };
}

function mockChatSessions(overrides: Partial<typeof chatSessions>): RestoreFn {
  const originals = new Map<string, unknown>();

  for (const [key, value] of Object.entries(overrides)) {
    originals.set(key, (chatSessions as any)[key]);
    (chatSessions as any)[key] = value;
  }

  return () => {
    for (const [key, value] of originals) {
      (chatSessions as any)[key] = value;
    }
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

async function requestJson(baseUrl: string, path: string, options: RequestInit = {}) {
  return await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

test('/chat/sessions routes expose user scoped session state', async (t) => {
  await t.test('lists sessions', async () => {
    const restores = [
      mockGetUser(async () => ({ data: { user: validUser('user-1') }, error: null })),
      mockChatSessions({
        listChatSessions: async (userId: string) => {
          assert.equal(userId, 'user-1');
          return [
            {
              id: 'session-1',
              title: 'Tema',
              createdAt: '2026-05-17T00:00:00.000Z',
              updatedAt: '2026-05-17T00:00:01.000Z',
            },
          ];
        },
      }),
    ];
    const { server, baseUrl } = await startServer();

    try {
      const response = await requestJson(baseUrl, '/chat/sessions', {
        headers: authHeaders('token'),
      });
      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(typeof payload.requestId, 'string');
      assert.deepEqual(payload.sessions, [
        {
          id: 'session-1',
          title: 'Tema',
          createdAt: '2026-05-17T00:00:00.000Z',
          updatedAt: '2026-05-17T00:00:01.000Z',
        },
      ]);
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });

  await t.test('creates a session', async () => {
    const restores = [
      mockGetUser(async () => ({ data: { user: validUser('user-1') }, error: null })),
      mockChatSessions({
        createChatSession: async (userId: string, title?: string) => {
          assert.equal(userId, 'user-1');
          assert.equal(title, 'Nuevo tema');
          return {
            id: 'session-2',
            title: 'Nuevo tema',
            createdAt: '2026-05-17T00:00:00.000Z',
            updatedAt: '2026-05-17T00:00:00.000Z',
          };
        },
      }),
    ];
    const { server, baseUrl } = await startServer();

    try {
      const response = await requestJson(baseUrl, '/chat/sessions', {
        method: 'POST',
        headers: authHeaders('token'),
        body: JSON.stringify({ title: 'Nuevo tema' }),
      });
      const payload = await response.json();

      assert.equal(response.status, 201);
      assert.equal(payload.session.id, 'session-2');
      assert.equal(typeof payload.requestId, 'string');
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });

  await t.test('returns messages', async () => {
    const restores = [
      mockGetUser(async () => ({ data: { user: validUser('user-1') }, error: null })),
      mockChatSessions({
        listChatMessages: async (userId: string, sessionId: string) => {
          assert.equal(userId, 'user-1');
          assert.equal(sessionId, 'session-1');
          return [
            {
              id: 'message-1',
              role: 'user',
              content: 'Pregunta',
              sequence: 1,
              createdAt: '2026-05-17T00:00:00.000Z',
            },
          ];
        },
      }),
    ];
    const { server, baseUrl } = await startServer();

    try {
      const response = await requestJson(baseUrl, '/chat/sessions/session-1/messages', {
        headers: authHeaders('token'),
      });
      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.deepEqual(payload.messages, [
        {
          id: 'message-1',
          role: 'user',
          content: 'Pregunta',
          sequence: 1,
          createdAt: '2026-05-17T00:00:00.000Z',
        },
      ]);
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });

  await t.test('maps missing sessions to 404', async () => {
    const restores = [
      mockGetUser(async () => ({ data: { user: validUser('user-1') }, error: null })),
      mockChatSessions({
        listChatMessages: async () => {
          throw new chatSessions.ChatSessionNotFoundError('Chat session not found');
        },
      }),
    ];
    const { server, baseUrl } = await startServer();

    try {
      const response = await requestJson(baseUrl, '/chat/sessions/missing/messages', {
        headers: authHeaders('token'),
      });
      const payload = await response.json();

      assert.equal(response.status, 404);
      assert.equal(payload.error, 'Chat session not found');
      assert.equal(typeof payload.requestId, 'string');
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });

  await t.test('deletes a session', async () => {
    const deleted: string[] = [];
    const restores = [
      mockGetUser(async () => ({ data: { user: validUser('user-1') }, error: null })),
      mockChatSessions({
        deleteChatSession: async (userId: string, sessionId: string) => {
          assert.equal(userId, 'user-1');
          deleted.push(sessionId);
        },
      }),
    ];
    const { server, baseUrl } = await startServer();

    try {
      const response = await requestJson(baseUrl, '/chat/sessions/session-1', {
        method: 'DELETE',
        headers: authHeaders('token'),
      });

      assert.equal(response.status, 204);
      assert.deepEqual(deleted, ['session-1']);
    } finally {
      restoreAll(restores);
      await stopServer(server);
    }
  });
});
