'use client'
import { useRouter } from 'next/navigation'
import { useAdmin } from '../../hooks/useAdmin'
import { useEffect } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAdmin()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/')
    }
  }, [isAdmin, loading, router])

  if (loading) return <div>Loading...</div>
  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-slate-900">
      <nav className="bg-slate-800 shadow-lg border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold text-white">Admin Panel</h1>
          <a href="/" className="text-blue-400 hover:text-blue-300 text-sm">
            Volver al Chat
          </a>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto p-6">
        {children}
      </main>
    </div>
  )
}
