'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { useAuth } from '../../hooks/useAuth';

interface Document {
  id: number;
  name: string;
  content?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export const DocList = () => {
  const queryClient = useQueryClient();
  const { getAccessToken } = useAuth();

  const fetchDocuments = async (): Promise<Document[]> => {
    const token = await getAccessToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/admin/documents`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch documents');
    }
    
    return res.json();
  };

  const deleteDocument = async (id: number): Promise<void> => {
    const token = await getAccessToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/admin/documents/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      throw new Error('Failed to delete document');
    }
  };
  
  const { data: docs, isLoading, error } = useQuery({
    queryKey: ['admin-documents'],
    queryFn: fetchDocuments,
  });

  // Ensure docs is always an array
  const docList = Array.isArray(docs) ? docs : (docs as any)?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8">
          <span className="inline-block animate-pulse text-gray-500">Cargando documentos...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8 text-red-600">
          Error: {error instanceof Error ? error.message : 'Failed to load documents'}
        </div>
      </Card>
    );
  }

  return (
    <Card className="card p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white">Documentos</h2>
        <span className="text-sm text-gray-400 bg-black/20 px-3 py-1 rounded-full">{docList.length || 0} cargados</span>
      </div>
      
      {(!docList || docList.length === 0) ? (
        <div className="text-center py-12 text-gray-500 bg-black/10 rounded-xl">
          No hay documentos subidos aún.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="py-4 px-4 text-sm font-semibold text-gray-400">Nombre</th>
                <th className="py-4 px-4 text-sm font-semibold text-gray-400">Fecha</th>
                <th className="py-4 px-4 text-sm font-semibold text-gray-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {docList.map((doc: Document) => (
                <tr 
                  key={doc.id}
                  className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl bg-gray-700 p-2 rounded-lg">📄</span>
                      <span className="font-medium text-gray-200">{doc.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-400">
                    {(() => {
                      if (!doc.created_at) return 'Sin fecha';
                      const date = new Date(doc.created_at);
                      if (isNaN(date.getTime())) return 'Fecha inválida';
                      return date.toLocaleString('es-CO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    })()}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-400 hover:text-red-300 transition-colors font-medium text-sm"
                    >
                      {deleteMutation.isPending ? '...' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
