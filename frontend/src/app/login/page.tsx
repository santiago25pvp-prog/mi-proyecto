'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import { Button } from '../../components/atoms/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md card">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Chat RAG
          </h1>
          <p className="text-slate-400">
            Ingresá a tu cuenta
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Contraseña
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full input"
              required
            />
          </div>

          {error && (
            <div className={`p-3 rounded-md text-sm bg-red-900/30 text-red-300 border border-red-800`}>
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full btn-primary"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          ¿No tenés cuenta? 
          <button 
            onClick={() => router.push('/register')}
            className="text-blue-400 hover:text-blue-300 font-medium ml-1"
          >
            Registrate
          </button>
        </p>
      </Card>
    </div>
  );
}
