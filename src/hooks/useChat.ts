import { useState, useCallback } from 'react';
import api from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    const newUserMessage: Message = { id: Date.now().toString(), role: 'user', content };
    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const { data } = await api.post('/chat', { message: content });
      
      // Simulate streaming with a typing effect
      let assistantMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' };
      setMessages((prev) => [...prev, assistantMessage]);

      const fullContent = data.response;
      for (let i = 0; i < fullContent.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 20));
        assistantMessage = { ...assistantMessage, content: assistantMessage.content + fullContent[i] };
        setMessages((prev) => [...prev.slice(0, -1), assistantMessage]);
      }
    } catch (error: any) {
      if (error.isRateLimited) {
        // Here we would trigger a toast, but this hook doesn't know about UI components.
        // We throw it so the component can catch and show the toast.
        throw error;
      }
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { messages, sendMessage, isLoading };
};
