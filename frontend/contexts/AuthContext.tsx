'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/utils/api';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDevMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const router = useRouter();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('user');
        const devMode = localStorage.getItem('dev_mode') === 'true';

        if (storedToken && storedUser) {
          // If in development mode, skip token verification
          if (devMode) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            setIsDevMode(true);
          } else {
            // Verify token is still valid with backend
            try {
              const response = await authApi.getMe(storedToken);
              if (response.success && response.data) {
                setToken(storedToken);
                setUser(response.data);
              } else {
                // Token invalid, clear storage
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user');
              }
            } catch {
              // Token invalid, clear storage
              localStorage.removeItem('auth_token');
              localStorage.removeItem('user');
            }
          }
        }
      } catch {
        // Auth initialization error handled silently
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });

    if (response.success && response.data) {
      const { token: newToken, user: newUser } = response.data;

      localStorage.setItem('auth_token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.removeItem('dev_mode');

      setToken(newToken);
      setUser(newUser);
      setIsDevMode(false);

      router.push('/');
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('dev_mode');
    setToken(null);
    setUser(null);
    setIsDevMode(false);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        isDevMode,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
