import { useState, useCallback } from 'react';
import apiClient from '../lib/apiClient';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/chat', { content });
      
      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      // Simulation of streaming
      const fullResponse = response.data.content;
      for (let i = 0; i <= fullResponse.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 30));
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === assistantId ? { ...msg, content: fullResponse.slice(0, i) } : msg
          )
        );
      }
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('Too many requests. Please wait a moment.');
      } else {
        setError('An error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { messages, sendMessage, isLoading, error };
};
