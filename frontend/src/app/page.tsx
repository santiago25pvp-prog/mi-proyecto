'use client'
import { useAuth } from '../hooks/useAuth'
import ChatWindow from '../components/ChatWindow'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-gray-500">Cargando...</div>
    </div>
  )
  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-slate-800 shadow-lg border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Chat RAG</h1>
          <div className="flex items-center gap-4 relative">
            {user.app_metadata?.role === 'admin' && (
              <a href="/admin" className="text-sm text-slate-300 hover:text-white">
                Admin
              </a>
            )}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="text-sm text-slate-300 hover:text-white focus:outline-none"
              >
                {user.email}
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 py-2 w-48 bg-slate-800 rounded-md shadow-xl z-20 border border-slate-700">
                  <button
                    onClick={handleSignOut}
                    className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 w-full text-left"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <ChatWindow />
      </main>
    </div>
  );
}
