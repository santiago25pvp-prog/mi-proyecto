import React from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
}

interface MessageItemProps {
  message: Message;
}

export default function MessageItem({ message }: MessageItemProps) {
  return (
    <div className={`p-2 rounded ${message.sender === 'user' ? 'bg-blue-100 self-end' : 'bg-gray-100 self-start'}`}>
      <ReactMarkdown>{message.content}</ReactMarkdown>
    </div>
  );
}
