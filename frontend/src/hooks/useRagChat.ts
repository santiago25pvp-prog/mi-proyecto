import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const useRagChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    setLoading(true);
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: message }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) throw new Error('Unauthorized');

      const response = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      
      // Initialize assistant message in state
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantMessage += chunk;
        
        // Update the last message (the assistant's)
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = assistantMessage;
          return newMessages;
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { messages, loading, error, sendMessage };
};
