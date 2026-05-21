'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { superadminAPI, clearSATokens } from '../utils/superadminApi';

interface SuperAdmin {
  id: number;
  name: string;
  email: string;
  role: 'superadmin';
}

interface SAContextType {
  superadmin: SuperAdmin | null;
  otpPending: boolean;
  otpEmail: string;
  login: (email: string, password: string) => Promise<void>;
  verifyOtp: (otp: string) => Promise<void>;
  resendOtp: () => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const SAContext = createContext<SAContextType | undefined>(undefined);

export const SAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [superadmin, setSuperadmin] = useState<SuperAdmin | null>(null);
  const [loading, setLoading]       = useState(true);
  const [otpPending, setOtpPending] = useState(false);
  const [otpEmail, setOtpEmail]     = useState('');

  const logout = useCallback(() => {
    clearSATokens();
    setSuperadmin(null);
    setOtpPending(false);
    setOtpEmail('');
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('sa_token');
    if (!token) { setLoading(false); return; }
    superadminAPI.me()
      .then(res => setSuperadmin(res.data))
      .catch(() => clearSATokens())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await superadminAPI.login(email, password);
    const { otp_token, message } = res.data;
    // Store otp_token temporarily for verify-otp call
    localStorage.setItem('sa_token', otp_token);
    setOtpEmail(message || email);
    setOtpPending(true);
  };

  const verifyOtp = async (otp: string) => {
    const res = await superadminAPI.verifyOtp(otp);
    const { token, refresh_token, superadmin: sa } = res.data;
    localStorage.setItem('sa_token', token);
    if (refresh_token) localStorage.setItem('sa_refresh_token', refresh_token);
    setSuperadmin(sa);
    setOtpPending(false);
    setOtpEmail('');
  };

  const resendOtp = async () => {
    await superadminAPI.resendOtp();
  };

  return (
    <SAContext.Provider value={{ superadmin, otpPending, otpEmail, login, verifyOtp, resendOtp, logout, loading }}>
      {children}
    </SAContext.Provider>
  );
};

export const useSA = () => {
  const ctx = useContext(SAContext);
  if (!ctx) throw new Error('useSA must be used within SAProvider');
  return ctx;
};
