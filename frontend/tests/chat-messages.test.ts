const assert = require("node:assert/strict");
const { test } = require("node:test");

import { removeMessageById } from "../lib/chat-messages";
import type { ChatMessage } from "../lib/types";

test("removeMessageById removes only the failed optimistic message", () => {
  const messages: ChatMessage[] = [
    { id: "assistant-1", role: "assistant", content: "ready" },
    { id: "user-failed", role: "user", content: "question" },
    { id: "assistant-2", role: "assistant", content: "context" },
  ];

  assert.deepEqual(removeMessageById(messages, "user-failed"), [
    { id: "assistant-1", role: "assistant", content: "ready" },
    { id: "assistant-2", role: "assistant", content: "context" },
  ]);
});
