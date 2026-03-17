'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../atoms/Card';
import { useAuth } from '../../hooks/useAuth';

interface Stats {
  docCount: number;
  requestCount: number;
  userCount?: number;
}

export const Stats = () => {
  const { getAccessToken } = useAuth();

  const fetchStats = async (): Promise<Stats> => {
    const token = await getAccessToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch stats');
    }
    
    return res.json();
  };

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8">
          <span className="inline-block animate-pulse text-gray-500">Cargando estadísticas...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8 text-red-600">
          Error: {error instanceof Error ? error.message : 'Failed to load stats'}
        </div>
      </Card>
    );
  }

  return (
    <Card className="card p-6">
      <h2 className="text-xl font-semibold mb-6 text-white">Estadísticas del Sistema</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatItem 
          label="Documentos" 
          value={stats?.docCount ?? 0} 
          icon="📄"
          color="blue"
        />
        <StatItem 
          label="Consultas" 
          value={stats?.requestCount ?? 0} 
          icon="💬"
          color="green"
        />
        {stats?.userCount !== undefined && (
          <StatItem 
            label="Usuarios" 
            value={stats.userCount} 
            icon="👥"
            color="purple"
          />
        )}
      </div>
    </Card>
  );
};

interface StatItemProps {
  label: string;
  value: number;
  icon: string;
  color: 'blue' | 'green' | 'purple';
}

const StatItem: React.FC<StatItemProps> = ({ label, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-950/30 border-blue-800 text-blue-300',
    green: 'bg-emerald-950/30 border-emerald-800 text-emerald-300',
    purple: 'bg-purple-950/30 border-purple-800 text-purple-300',
  };

  return (
    <div className={`p-6 rounded-2xl border ${colorClasses[color]} flex items-center gap-4`}>
      <div className="text-3xl bg-black/20 p-3 rounded-xl">{icon}</div>
      <div>
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
};
