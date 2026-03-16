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
    <div className="admin-layout">
      <nav>Admin Panel</nav>
      {children}
    </div>
  )
}
