import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import test from 'node:test';
process.env.SUPABASE_URL ??= 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key';

const { createApp: buildApp } = require('../server') as typeof import('../server');
const { supabase } = require('../services/vector-db') as typeof import('../services/vector-db');
const adminService = require('../services/adminService') as typeof import('../services/adminService');

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

function mockGetUser(
  implementation: (token: string) => Promise<{
    data: { user: any };
    error: any;
  }>,
) {
  const original = supabase.auth.getUser.bind(supabase.auth);
  supabase.auth.getUser = implementation as typeof supabase.auth.getUser;

  return () => {
    supabase.auth.getUser = original;
  };
}

function mockListDocuments(
  implementation: typeof adminService.listDocuments,
) {
  const original = adminService.listDocuments;
  (adminService as any).listDocuments = implementation;

  return () => {
    (adminService as any).listDocuments = original;
  };
}

test('admin routes enforce authentication and admin authorization', async (t) => {
  await t.test('returns 401 when bearer token is missing', async () => {
    const { server, baseUrl } = await startServer();

    try {
      const response = await fetch(`${baseUrl}/admin/documents`);

      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), {
        error: 'Unauthorized: Missing or invalid token',
      });
    } finally {
      await stopServer(server);
    }
  });

  await t.test('returns 403 when authenticated user is not admin', async () => {
    const restoreGetUser = mockGetUser(async () => ({
      data: {
        user: {
          id: 'user-123',
          app_metadata: { role: 'user' },
        },
      },
      error: null,
    }));

    const { server, baseUrl } = await startServer();

    try {
      const response = await fetch(`${baseUrl}/admin/documents`, {
        headers: {
          Authorization: 'Bearer valid-user-token',
        },
      });

      assert.equal(response.status, 403);
      assert.deepEqual(await response.json(), {
        error: 'Forbidden: Admins only',
      });
    } finally {
      restoreGetUser();
      await stopServer(server);
    }
  });

  await t.test('returns 200 and documents payload when authenticated admin requests documents', async () => {
    let receivedPage = 0;
    let receivedPageSize = 0;

    const restoreGetUser = mockGetUser(async () => ({
      data: {
        user: {
          id: 'admin-123',
          app_metadata: { role: 'admin' },
        },
      },
      error: null,
    }));

    const restoreListDocuments = mockListDocuments(async (page, pageSize) => {
      receivedPage = page;
      receivedPageSize = pageSize;

      return {
        data: [
          {
            id: 1,
            name: 'Manual de prueba',
            content: 'Contenido indexado',
            created_at: '2026-04-07T00:00:00.000Z',
            metadata: { url: 'https://example.com' },
          },
        ],
        count: 1,
      };
    });

    const { server, baseUrl } = await startServer();

    try {
      const response = await fetch(`${baseUrl}/admin/documents?page=2&pageSize=25`, {
        headers: {
          Authorization: 'Bearer valid-admin-token',
        },
      });

      assert.equal(response.status, 200);
      assert.equal(receivedPage, 2);
      assert.equal(receivedPageSize, 25);
      assert.deepEqual(await response.json(), {
        data: [
          {
            id: 1,
            name: 'Manual de prueba',
            content: 'Contenido indexado',
            created_at: '2026-04-07T00:00:00.000Z',
            metadata: { url: 'https://example.com' },
          },
        ],
        count: 1,
      });
    } finally {
      restoreListDocuments();
      restoreGetUser();
      await stopServer(server);
    }
  });

  await t.test('returns 400 when pagination query params are invalid', async () => {
    const restoreGetUser = mockGetUser(async () => ({
      data: {
        user: {
          id: 'admin-123',
          app_metadata: { role: 'admin' },
        },
      },
      error: null,
    }));

    const { server, baseUrl } = await startServer();

    try {
      const response = await fetch(`${baseUrl}/admin/documents?page=abc&pageSize=0`, {
        headers: {
          Authorization: 'Bearer valid-admin-token',
        },
      });

      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: 'Invalid request',
        details: [
          'page must be a positive integer',
          'pageSize must be a positive integer',
        ],
      });
    } finally {
      restoreGetUser();
      await stopServer(server);
    }
  });

  await t.test('returns 400 when document id is invalid', async () => {
    const restoreGetUser = mockGetUser(async () => ({
      data: {
        user: {
          id: 'admin-123',
          app_metadata: { role: 'admin' },
        },
      },
      error: null,
    }));

    const { server, baseUrl } = await startServer();

    try {
      const response = await fetch(`${baseUrl}/admin/documents/not-a-number`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer valid-admin-token',
        },
      });

      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: 'Invalid request',
        details: ['id must be a positive integer'],
      });
    } finally {
      restoreGetUser();
      await stopServer(server);
    }
  });
});
