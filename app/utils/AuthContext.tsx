'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  team_id?: number;
  department_id?: number;
  manager_id?: number;
  team_name?: string;
  department_name?: string;
  profile_image?: string;
  created_at?: string;
  bio?: string;
  dob?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const clearStorage = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearStorage();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await authAPI.getCurrentUser();
      setUser(res.data);
    } catch (err) {
      console.error('Failed to refresh user', err);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    authAPI.getCurrentUser()
      .then(res => setUser(res.data))
      .catch((err) => {
        console.error('Initial user fetch failed', err);
        clearStorage();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password);
    const { token, refresh_token, user: userData } = response.data;
    localStorage.setItem('token', token);
    if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
