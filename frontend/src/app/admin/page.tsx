'use client'
import { DocList } from '../../components/organisms/DocList'
import { Stats } from '../../components/organisms/Stats'
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
      <div className="grid gap-6">
        <Stats />
        <DocList />
      </div>
    </div>
  )
}
