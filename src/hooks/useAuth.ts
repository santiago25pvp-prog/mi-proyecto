import { useState } from 'react';
import api from '../lib/api';
import { toast } from 'sonner';

export const useAuth = () => {
  const [user, setUser] = useState(null);

  const login = async (credentials: any) => {
    try {
      const response = await api.post('/auth/login', credentials);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      toast.success('Login successful');
    } catch (error: any) {
      if (error.isRateLimited) {
        toast.warning('Too many requests. Please wait.');
      } else {
        toast.error('Login failed');
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return { user, login, logout };
};