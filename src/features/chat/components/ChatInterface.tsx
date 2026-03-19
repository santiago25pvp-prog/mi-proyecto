import React from 'react';
import { ChatInput } from './ChatInput';

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = React.useState<string[]>([]);
  const [inputValue, setInputValue] = React.useState('');

  const handleSend = () => {
    if (inputValue.trim()) {
      setMessages([...messages, inputValue]);
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border rounded-xl overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className="p-3 bg-white border rounded-lg shadow-sm w-max max-w-[80%]">
            {message}
          </div>
        ))}
      </div>
      <ChatInput value={inputValue} onChange={setInputValue} onSend={handleSend} />
    </div>
  );
};
