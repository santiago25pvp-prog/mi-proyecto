const assert = require("node:assert/strict");
const { mock, test } = require("node:test");

import {
  BackendApiError,
  fetchIngestJobStatus,
  getBackendErrorInfo,
  ingestDocument,
  sendChatMessage,
} from "../lib/backend";

test("sendChatMessage surfaces requestId from backend errors", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => ({
    ok: false,
    status: 500,
    text: async () =>
      JSON.stringify({ error: "Backend explotado", requestId: "req-123" }),
  } as Response));

  try {
    await assert.rejects(
      () => sendChatMessage("token", "hola"),
      (error: unknown) => {
        assert.equal(error instanceof BackendApiError, true);

        const backendError = error as BackendApiError;

        assert.equal(backendError.message, "Backend explotado");
        assert.equal(backendError.status, 500);
        assert.equal(backendError.requestId, "req-123");
        return true;
      },
    );
  } finally {
    fetchMock.mock.restore();
  }
});

test("getBackendErrorInfo returns fallback data for unknown errors", () => {
  assert.deepEqual(getBackendErrorInfo("boom", "Error genérico"), {
    message: "Error genérico",
    requestId: null,
    metadata: {
      code: null,
      degraded: false,
      retryable: false,
      retryAfterMs: null,
    },
  });
});

test("sendChatMessage preserves additive degraded metadata for compatibility", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => ({
    ok: false,
    status: 503,
    text: async () =>
      JSON.stringify({
        error: "Provider temporarily unavailable",
        requestId: "req-503",
        code: "UPSTREAM_TEMPORARY_UNAVAILABLE",
        degraded: true,
        retryable: true,
        retryAfterMs: 900,
      }),
  } as Response));

  try {
    await assert.rejects(
      () => sendChatMessage("token", "hola"),
      (error: unknown) => {
        assert.equal(error instanceof BackendApiError, true);

        const backendError = error as BackendApiError;

        assert.equal(backendError.message, "Provider temporarily unavailable");
        assert.equal(backendError.status, 503);
        assert.equal(backendError.requestId, "req-503");
        assert.deepEqual(backendError.metadata, {
          code: "UPSTREAM_TEMPORARY_UNAVAILABLE",
          degraded: true,
          retryable: true,
          retryAfterMs: 900,
        });
        return true;
      },
    );
  } finally {
    fetchMock.mock.restore();
  }
});

test("ingestDocument returns queued job metadata", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => ({
    ok: true,
    status: 202,
    text: async () =>
      JSON.stringify({
        jobId: "job-123",
        status: "queued",
        requestId: "req-ingest",
      }),
  } as Response));

  try {
    const result = await ingestDocument("token", "https://example.com/docs");

    assert.deepEqual(result, {
      jobId: "job-123",
      status: "queued",
      requestId: "req-ingest",
    });
    assert.equal(fetchMock.mock.calls[0].arguments[1]?.method, "POST");
  } finally {
    fetchMock.mock.restore();
  }
});

test("fetchIngestJobStatus returns terminal job result", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => ({
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        jobId: "job-123",
        status: "done",
        url: "https://example.com/docs",
        attempts: 1,
        maxAttempts: 3,
        createdAt: "2026-05-17T00:00:00.000Z",
        updatedAt: "2026-05-17T00:00:01.000Z",
        result: {
          status: "success",
          chunks_inserted: 2,
          chunks_failed: 0,
        },
        requestId: "req-status",
      }),
  } as Response));

  try {
    const result = await fetchIngestJobStatus("token", "job-123");

    assert.deepEqual(result.result, {
      status: "success",
      chunks_inserted: 2,
      chunks_failed: 0,
    });
    assert.equal(result.status, "done");
    assert.equal(fetchMock.mock.calls[0].arguments[1]?.method, undefined);
  } finally {
    fetchMock.mock.restore();
  }
});
