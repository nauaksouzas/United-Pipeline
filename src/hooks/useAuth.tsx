import { createContext, useContext, useState, useEffect } from 'react';

import { safeFetch } from '../lib/fetchUtils';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithProvider: (provider: 'google' | 'microsoft' | 'apple') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: any }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'include' })
      .then(res => {
        if (!res.ok) return { user: null };
        return res.json();
      })
      .then(data => setUser(data.user || null))
      .catch((e) => {
        console.error('Session check failed:', e);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.removeItem('auth_token');
    setUser(data.user);
  };

  const loginWithProvider = async (provider: 'google' | 'microsoft' | 'apple') => {
    const { signInWith } = await import('../firebase');
    const result = await signInWith(provider);
    const res = await fetch('/api/auth/oauth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ idToken: result.idToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err: any = new Error(data.error || 'OAuth failed');
      err.status = res.status;
      err.email = data.email;
      err.name = data.name;
      throw err;
    }
    localStorage.removeItem('auth_token');
    setUser(data.user);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithProvider, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
