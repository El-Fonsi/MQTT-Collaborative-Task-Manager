import { useCallback } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { user, isAuthenticated, setAuth, logout } = useAuthStore();

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAuth(data.user, data.token);
    return data;
  }, [setAuth]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const { data } = await api.post('/auth/register', { email, password, name });
    setAuth(data.user, data.token);
    return data;
  }, [setAuth]);

  return { user, isAuthenticated, login, register, logout };
}
