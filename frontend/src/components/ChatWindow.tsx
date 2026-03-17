import React from 'react';
import MessageItem from './MessageItem';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
}

interface ChatWindowProps {
  messages: Message[];
}

export default function ChatWindow({ messages }: ChatWindowProps) {
  return (
    <div className="flex flex-col space-y-4 p-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}
