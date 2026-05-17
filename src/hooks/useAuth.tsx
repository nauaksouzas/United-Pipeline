import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch('/api/auth/session', { headers, credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return { user: null };
        
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await res.text();
          if (text.includes('Cookie check')) {
            console.error('Session check intercepted by platform cookie check. Browser may be blocking third-party cookies.');
          } else {
            console.error('Session check failed: Non-JSON response', text);
          }
          return { user: null };
        }
        
        return res.json();
      })
      .then(data => setUser(data.user || null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      if (text.includes('Cookie check')) {
        throw new Error("Action required to load your app: Your browser is blocking a required security cookie. Please open the app in a new tab or enable third-party cookies.");
      }
      console.error('Server returned non-JSON response:', text);
      throw new Error(`Server error: Expected JSON but received ${contentType || 'unknown content'}.`);
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.token) localStorage.setItem('auth_token', data.token);
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
    if (data.token) localStorage.setItem('auth_token', data.token);
    setUser(data.user);
  };

  const logout = async () => {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    await fetch('/api/auth/logout', { method: 'POST', headers, credentials: 'include' });
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
