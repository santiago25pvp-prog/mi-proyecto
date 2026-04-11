const assert = require("node:assert/strict");
const { test } = require("node:test");

import {
  getChatStorageKey,
  loadPersistedChatStateWithKey,
  savePersistedChatStateWithKey,
  type PersistedChatState,
} from "../lib/chat-storage";

function createStorageMock(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  const calls = {
    setItem: [] as Array<[string, string]>,
    removeItem: [] as string[],
  };

  const storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      calls.setItem.push([key, value]);
      store.set(key, value);
    },
    removeItem(key: string) {
      calls.removeItem.push(key);
      store.delete(key);
    },
  };

  return { storage, store, calls };
}

test("getChatStorageKey scopes state per user and falls back to anonymous", () => {
  assert.equal(getChatStorageKey("user-1"), "atlas.chat-shell.v1:user-1");
  assert.equal(getChatStorageKey(undefined), "atlas.chat-shell.v1:anonymous");
  assert.equal(getChatStorageKey(null), "atlas.chat-shell.v1:anonymous");
});

test("persisted chat state round-trips through storage", () => {
  const { storage } = createStorageMock();
  const key = getChatStorageKey("user-1");
  const state: PersistedChatState = {
    activeMessageId: "assistant-2",
    messages: [
      { id: "user-1", role: "user", content: "hello" },
      { id: "assistant-1", role: "assistant", content: "hi" },
      { id: "assistant-2", role: "assistant", content: "follow up" },
    ],
  };

  savePersistedChatStateWithKey(storage, state, key);

  const loaded = loadPersistedChatStateWithKey(storage, key);

  assert.deepEqual(loaded, state);
});

test("invalid JSON and malformed payloads return null", () => {
  const invalidJson = createStorageMock({ broken: "{" });
  assert.equal(loadPersistedChatStateWithKey(invalidJson.storage, "broken"), null);

  const malformed = createStorageMock({
    broken: JSON.stringify({
      activeMessageId: "missing",
      messages: [{ id: 1, role: "assistant", content: "nope" }],
    }),
  });

  assert.equal(loadPersistedChatStateWithKey(malformed.storage, "broken"), null);
});

test("invalid active message falls back to the last assistant message", () => {
  const { storage } = createStorageMock({
    chat: JSON.stringify({
      activeMessageId: "missing",
      messages: [
        { id: "user-1", role: "user", content: "hello" },
        { id: "assistant-1", role: "assistant", content: "first" },
        { id: "assistant-2", role: "assistant", content: "second" },
      ],
    }),
  });

  const loaded = loadPersistedChatStateWithKey(storage, "chat");

  assert.deepEqual(loaded, {
    activeMessageId: "assistant-2",
    messages: [
      { id: "user-1", role: "user", content: "hello" },
      { id: "assistant-1", role: "assistant", content: "first" },
      { id: "assistant-2", role: "assistant", content: "second" },
    ],
  });
});

test("empty message lists remove the storage key", () => {
  const { storage, calls } = createStorageMock({ existing: "keep me" });

  savePersistedChatStateWithKey(
    storage,
    {
      activeMessageId: null,
      messages: [],
    },
    "existing",
  );

  assert.deepEqual(calls.setItem, []);
  assert.deepEqual(calls.removeItem, ["existing"]);
  assert.equal(storage.getItem("existing"), null);
});
