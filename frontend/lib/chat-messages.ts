import type { ChatMessage } from "@/lib/types";

export function removeMessageById(messages: ChatMessage[], messageId: string) {
  return messages.filter((message) => message.id !== messageId);
}
