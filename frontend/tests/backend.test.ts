const assert = require("node:assert/strict");
const { mock, test } = require("node:test");

import {
  BackendApiError,
  getBackendErrorInfo,
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
  });
});
