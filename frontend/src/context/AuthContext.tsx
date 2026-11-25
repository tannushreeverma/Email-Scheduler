import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, AuthState } from '../types';
import { authApi } from '../services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setState({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const response = await authApi.getCurrentUser();
      setState({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem('auth_token');
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  useEffect(() => {
    // Check for token in URL (after OAuth redirect)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('auth_token', token);
      window.history.replaceState({}, '', window.location.pathname);
    }

    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const response = await authApi.loginWithEmail(email, password);
    localStorage.setItem('auth_token', response.data.token);
    setState({
      user: response.data.user,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const loginWithGoogle = () => {
    authApi.loginWithGoogle();
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if logout API fails, clear local state
    }
    localStorage.removeItem('auth_token');
    setState({ user: null, isAuthenticated: false, isLoading: false });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
