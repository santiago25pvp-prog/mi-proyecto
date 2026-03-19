'use client'
import { useAuth } from '@/src/hooks/useAuth'
import { ChatWindow } from '@/src/components/organisms/ChatWindow'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { MainLayout } from '@/src/components/layout/MainLayout'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-gray-500">Cargando...</div>
    </div>
  )
  if (!user) return null

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <header className="bg-slate-800 shadow-lg border-b border-slate-700">
          <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-white">Chat RAG</h1>
          </div>
        </header>
        
        <main className="max-w-4xl mx-auto px-4 py-8">
          <ChatWindow />
        </main>
      </div>
    </MainLayout>
  );
}
