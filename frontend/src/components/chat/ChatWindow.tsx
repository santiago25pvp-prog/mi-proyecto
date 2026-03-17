import React from 'react';
import { useRagChat } from '../../hooks/useRagChat';
import { MessageBubble } from '../molecules/MessageBubble';
import { ChatInput } from './ChatInput';

export const ChatWindow = () => {
  const { messages, loading, error, sendMessage } = useRagChat();

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto border border-gray-700 bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m.content} isUser={m.role === 'user'} />
        ))}
        {loading && (
          <div className="text-gray-400 text-sm p-2 animate-pulse">Thinking...</div>
        )}
        {error && (
          <div className="text-red-500 text-sm p-2">Error: {error}</div>
        )}
      </div>
      <ChatInput onSend={sendMessage} disabled={loading} />
    </div>
  );
};
