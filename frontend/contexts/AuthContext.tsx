'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/utils/api';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDevMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const router = useRouter();

  // Initialize auth state - verify session with server via HttpOnly cookie
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const devMode = localStorage.getItem('dev_mode') === 'true';

        if (storedUser) {
          // If in development mode, skip token verification
          if (devMode) {
            setUser(JSON.parse(storedUser));
            setIsDevMode(true);
          } else {
            // Verify session is still valid with backend (cookie is sent automatically)
            try {
              const response = await authApi.getMe();
              if (response.success && response.data) {
                setUser(response.data);
                // Update stored user info
                localStorage.setItem('user', JSON.stringify(response.data));
              } else {
                // Session invalid, clear storage
                localStorage.removeItem('user');
              }
            } catch {
              // Session invalid, clear storage
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
      const { user: newUser } = response.data;

      // Store user info (token is in HttpOnly cookie set by server)
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.removeItem('dev_mode');

      setUser(newUser);
      setIsDevMode(false);

      router.push('/');
    }
  };

  const logout = async () => {
    try {
      // Call logout API to clear the HttpOnly cookie on server
      await authApi.logout();
    } catch {
      // Continue with local logout even if API fails
    }

    localStorage.removeItem('user');
    localStorage.removeItem('dev_mode');
    setUser(null);
    setIsDevMode(false);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
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
