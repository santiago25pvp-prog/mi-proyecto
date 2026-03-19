'use client'
import { useRouter } from 'next/navigation'
import { useAdmin } from '../../hooks/useAdmin'
import { useEffect } from 'react'
import { AppLayout } from '@/src/features/layout/components/AppLayout'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAdmin()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/')
    }
  }, [isAdmin, loading, router])

  if (loading) return <div className="p-6 text-white">Loading...</div>
  if (!isAdmin) return null

  return (
    <AppLayout>
      <div className="p-6">
         <h1 className="text-xl font-semibold text-gray-900 mb-6">Admin Panel</h1>
         {children}
      </div>
    </AppLayout>
  )
}
