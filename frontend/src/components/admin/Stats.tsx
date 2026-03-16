'use client'
import { useState, useEffect } from 'react'
import { adminService } from '../../services/adminService'

export const Stats = () => {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    adminService.getStats().then(setStats)
  }, [])

  if (!stats) return <div>Loading...</div>

  return (
    <div>
      <h2>Stats</h2>
      <p>Documents: {stats.docCount}</p>
      <p>Requests: {stats.requestCount}</p>
    </div>
  )
}
