import React from 'react';
import { Message } from '../../hooks/useChat';
import { ChatMessage } from './ChatMessage';

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ messages, isLoading, error }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {isLoading && <div className="text-gray-500 text-sm p-4">Loading...</div>}
      {error && <div className="text-red-500 text-sm p-4">{error}</div>}
    </div>
  );
};
