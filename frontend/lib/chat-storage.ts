import type { ChatMessage, ChatSource } from "@/lib/types";

export interface PersistedChatState {
  activeMessageId: string | null;
  messages: ChatMessage[];
}

const CHAT_STORAGE_KEY_PREFIX = "atlas.chat-shell.v1";

export function getChatStorageKey(userId: string | null | undefined) {
  return `${CHAT_STORAGE_KEY_PREFIX}:${userId || "anonymous"}`;
}

function isChatSource(value: unknown): value is ChatSource {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "content" in value &&
    typeof value.name === "string" &&
    typeof value.content === "string"
  );
}

function isChatMessage(value: unknown): value is ChatMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "role" in value &&
    "content" in value &&
    typeof value.id === "string" &&
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string" &&
    ("sources" in value ?
      value.sources === undefined ||
      (Array.isArray(value.sources) && value.sources.every(isChatSource))
      : true)
  );
}

function normalizePersistedState(value: unknown): PersistedChatState | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const messages = Array.isArray((value as { messages?: unknown }).messages)
    ? (value as { messages: unknown[] }).messages.filter(isChatMessage)
    : [];

  if (messages.length === 0) {
    return null;
  }

  const persistedActiveMessageId =
    typeof (value as { activeMessageId?: unknown }).activeMessageId === "string"
      ? (value as { activeMessageId: string }).activeMessageId
      : null;

  const fallbackActiveMessageId = messages.filter((message) => message.role === "assistant").at(-1)?.id ?? null;
  const activeMessageId = messages.some((message) => message.id === persistedActiveMessageId)
    ? persistedActiveMessageId
    : fallbackActiveMessageId;

  return {
    messages,
    activeMessageId,
  };
}

export function loadPersistedChatState(storage: Pick<Storage, "getItem"> | null | undefined) {
  if (!storage) {
    return null;
  }

  return loadPersistedChatStateWithKey(storage, getChatStorageKey(null));
}

export function loadPersistedChatStateWithKey(
  storage: Pick<Storage, "getItem"> | null | undefined,
  storageKey: string,
) {
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(storageKey);

  if (!raw) {
    return null;
  }

  try {
    return normalizePersistedState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function savePersistedChatState(
  storage: Pick<Storage, "setItem" | "removeItem"> | null | undefined,
  state: PersistedChatState,
) {
  return savePersistedChatStateWithKey(storage, state, getChatStorageKey(null));
}

export function savePersistedChatStateWithKey(
  storage: Pick<Storage, "setItem" | "removeItem"> | null | undefined,
  state: PersistedChatState,
  storageKey: string,
) {
  if (!storage) {
    return;
  }

  if (state.messages.length === 0) {
    storage.removeItem(storageKey);
    return;
  }

  storage.setItem(storageKey, JSON.stringify(state));
}
