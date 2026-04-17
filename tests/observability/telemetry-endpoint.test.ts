import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import http from 'node:http';
import { AddressInfo } from 'node:net';

import { telemetryReliabilityHandler } from '../../services/observability/telemetry-endpoint';

async function createServer() {
  const app = express();
  app.use(express.json());
  app.post('/telemetry/reliability', telemetryReliabilityHandler);

  const server = await new Promise<http.Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  const address = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function closeServer(server: http.Server) {
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

test('telemetry endpoint accepts valid degraded telemetry payloads', async () => {
  const { server, baseUrl } = await createServer();

  try {
    const response = await fetch(`${baseUrl}/telemetry/reliability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schemaVersion: 'v1',
        eventName: 'frontend_degraded_response_rendered',
        eventTs: new Date().toISOString(),
        requestId: 'req-telemetry-1',
        route: 'chat-shell',
        reliability: {
          code: 'UPSTREAM_TEMPORARY_UNAVAILABLE',
          degraded: true,
          retryable: true,
          retryAfterMs: 800,
        },
        ui: {
          toastShown: true,
          retryActionAvailable: true,
        },
      }),
    });

    const payload = await response.json();
    assert.equal(response.status, 202);
    assert.deepEqual(payload, { ok: true });
  } finally {
    await closeServer(server);
  }
});

test('telemetry endpoint rejects invalid payloads safely', async () => {
  const { server, baseUrl } = await createServer();

  try {
    const response = await fetch(`${baseUrl}/telemetry/reliability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ malformed: true }),
    });

    const payload = await response.json();
    assert.equal(response.status, 400);
    assert.equal(payload.ok, false);
  } finally {
    await closeServer(server);
  }
});
