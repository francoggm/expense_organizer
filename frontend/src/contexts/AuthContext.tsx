import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi, isAuthenticated, setAuthToken } from '../services/api';

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated()) {
        try {
          const response = await authApi.verify();
          setIsLoggedIn(response.success && response.data?.authenticated === true);
          if (!response.success) {
            setAuthToken(null);
          }
        } catch {
          setAuthToken(null);
          setIsLoggedIn(false);
        }
      }
      setIsLoading(false);
    };

    checkAuth();

    // Listen for logout events from API (401 responses)
    const handleLogout = () => {
      setIsLoggedIn(false);
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const login = async (password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authApi.login(password);
      if (response.success) {
        setIsLoggedIn(true);
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro de conexão' 
      };
    }
  };

  const logout = async () => {
    await authApi.logout();
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, login, logout }}>
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