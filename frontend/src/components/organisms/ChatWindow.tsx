'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../atoms/Button';
import { Textarea } from '../atoms/Textarea';
import { Card } from '../atoms/Card';
import { MessageBubble } from '../molecules/MessageBubble';
import { useAuth } from '../../hooks/useAuth';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  answer: string;
  sources?: Array<{ name: string; content: string }>;
}

export const ChatWindow = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const { getAccessToken, loading: authLoading } = useAuth();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const sendMessageMutation = useQuery({
    queryKey: ['chat', input],
    queryFn: async () => {
      if (!input.trim()) return null;
      
      const token = await getAccessToken();
      
      const userMessage: Message = { role: 'user', content: input };
      setMessages(prev => [...prev, userMessage]);
      
      const res = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: input })
      });
      
      const data: ChatResponse = await res.json();
      
      const assistantMessage: Message = { role: 'assistant', content: data.answer };
      setMessages(prev => [...prev, assistantMessage]);
      setInput('');
      
      return data;
    },
    enabled: false,
    staleTime: 0,
  });

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessageMutation.refetch();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-6 w-full max-w-6xl mx-auto">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0">
        <div className="card p-6 h-full">
          <h3 className="text-lg font-bold text-white mb-4">Historial</h3>
          <p className="text-gray-400 text-sm">Próximamente...</p>
        </div>
      </aside>

      {/* Main Chat */}
      <Card className="card w-full flex-grow shadow-2xl">
        {/* Messages Container */}
        <div className="h-[500px] overflow-y-auto mb-6 space-y-4 p-6 bg-gray-950/50 rounded-xl">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <div className="text-5xl mb-4">🤖</div>
              <p className="text-xl font-bold text-gray-300">¡Hola! ¿En qué te ayudo?</p>
              <p className="text-sm mt-2">Pregúntame sobre tus documentos.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <MessageBubble 
                key={i} 
                message={msg.content} 
                isUser={msg.role === 'user'} 
              />
            ))
          )}
          {sendMessageMutation.isFetching && (
            <div className="flex justify-start">
              <div className="bg-gray-800 px-5 py-4 rounded-2xl rounded-tl-none border border-gray-700">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="space-y-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Escribe tu pregunta aquí..."
            className="input w-full h-24"
            disabled={sendMessageMutation.isFetching}
          />
          <div className="flex justify-end">
            <button 
              onClick={handleSend}
              disabled={sendMessageMutation.isFetching || !input.trim()}
              className="btn-primary"
            >
              {sendMessageMutation.isFetching ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
