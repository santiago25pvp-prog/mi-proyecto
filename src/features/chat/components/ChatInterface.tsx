import React from 'react';
import { ChatInput } from './ChatInput';
import { MessageRenderer } from './MessageRenderer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputValue, setInputValue] = React.useState('');

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Add empty assistant message for streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message: inputValue }),
      });


      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;
        
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'assistant', content: assistantContent };
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border rounded-xl overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`p-3 border rounded-lg shadow-sm w-max max-w-[80%] ${message.role === 'user' ? 'bg-blue-100 ml-auto' : 'bg-white'}`}>
            <MessageRenderer content={message.content} />
          </div>
        ))}
      </div>
      <ChatInput value={inputValue} onChange={setInputValue} onSend={handleSend} />
    </div>
  );
};
