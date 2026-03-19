'use client'

import { ChatWindow } from '../../components/chat/ChatWindow';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppLayout } from '@/src/features/layout/components/AppLayout';

export default function ChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) return <div className="p-6 text-white">Loading...</div>;
  if (!user) return null;

  return (
    <AppLayout>
      <main className="flex-1 flex flex-col p-4 overflow-hidden h-full">
        <ChatWindow />
      </main>
    </AppLayout>
  );
}
