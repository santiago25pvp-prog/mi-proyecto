'use client'

import { ChatWindow } from '../../components/chat/ChatWindow';
import { Sidebar } from '../../components/organisms/Sidebar';
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
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar>
        <div className="text-slate-400 text-sm">
          <p className="mb-2">No hay historial todavía.</p>
          <p className="text-xs opacity-60">Start a new conversation above.</p>
        </div>
      </Sidebar>
      <main className="flex-1 flex flex-col p-4 overflow-hidden">
        <ChatWindow />
      </main>
    </div>
  );
}
