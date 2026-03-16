'use client'
import { DocList } from '../../components/admin/DocList'
import { Stats } from '../../components/admin/Stats'
import { useAdmin } from '../../hooks/useAdmin'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminPage() {
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <Stats />
      <DocList />
    </div>
  )
}
