'use client'

import { ChatWindow } from '../../components/chat/ChatWindow';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) return <div>Loading...</div>;
  if (!user) return null;

  return (
    <main style={{ padding: '20px' }}>
      <h1 style={{ textAlign: 'center' }}>Chat RAG</h1>
      <ChatWindow />
    </main>
  );
}
