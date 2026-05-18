import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import test from 'node:test';

process.env.GEMINI_API_KEY ??= 'test-gemini-key';
process.env.SUPABASE_URL ??= 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key';

const { createApp: buildApp } = require('../server') as typeof import('../server');

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

test('public errors are localized from Accept-Language when supported', async (t) => {
  await t.test('returns Spanish auth errors', async () => {
    const { server, baseUrl } = await startServer();

    try {
      const response = await fetch(`${baseUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': 'es-CO,es;q=0.9',
        },
        body: JSON.stringify({ query: 'hola' }),
      });
      const payload = await response.json();

      assert.equal(response.status, 401);
      assert.equal(payload.error, 'No autorizado: token faltante o inválido');
    } finally {
      await stopServer(server);
    }
  });

  await t.test('returns English not found errors', async () => {
    const { server, baseUrl } = await startServer();

    try {
      const response = await fetch(`${baseUrl}/missing`, {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      const payload = await response.json();

      assert.equal(response.status, 404);
      assert.equal(payload.error, 'Not Found');
    } finally {
      await stopServer(server);
    }
  });

  await t.test('preserves legacy fallback when no supported language is requested', async () => {
    const { server, baseUrl } = await startServer();

    try {
      const response = await fetch(`${baseUrl}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'hola' }),
      });
      const payload = await response.json();

      assert.equal(response.status, 401);
      assert.equal(payload.error, 'Unauthorized: Missing or invalid token');
    } finally {
      await stopServer(server);
    }
  });
});
