'use client';

import { useState, useEffect, useRef } from 'react';
import { useSA } from './SAContext';
import { clearSATokens } from '../utils/superadminApi';
import { useRouter } from 'next/navigation';

export default function SuperAdminLogin() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { login, verifyOtp, resendOtp, superadmin, otpPending, otpEmail } = useSA();
  const router = useRouter();

  useEffect(() => {
    if (superadmin) router.push('/superadmin/dashboard');
  }, [superadmin]);

  // Countdown timer for resend
  useEffect(() => {
    if (otpPending) setResendTimer(60);
  }, [otpPending]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpStr = otp.join('');
    if (otpStr.length !== 6) { setError('Enter all 6 digits'); return; }
    setError('');
    setLoading(true);
    try {
      await verifyOtp(otpStr);
      router.push('/superadmin/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid or expired OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError('');
    try {
      await resendOtp();
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to resend OTP');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '12px 14px',
    background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse 120% 80% at 50% 0%, #0f1729 0%, #080d1a 60%, #000 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Ambient orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '15%', left: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,68,68,.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,68,68,.05) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 420, padding: '0 20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 0 40px rgba(239,68,68,.3)',
          }}>
            <span style={{ fontSize: 28 }}>{otpPending ? '🔐' : '⚡'}</span>
          </div>
          <div style={{ fontSize: 11, letterSpacing: '0.25em', color: 'rgba(239,68,68,.7)', marginBottom: 8, textTransform: 'uppercase' }}>
            KairaFlow Platform
          </div>
          <h1 style={{
            margin: 0, fontSize: 26, fontWeight: 900,
            background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,.7) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>{otpPending ? 'Verify OTP' : 'Super Admin'}</h1>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'rgba(156,163,175,.6)' }}>
            {otpPending ? otpEmail : 'Platform control panel'}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,.97) 0%, rgba(8,13,26,.99) 100%)',
          border: `1px solid ${otpPending ? 'rgba(239,68,68,.25)' : 'rgba(239,68,68,.15)'}`,
          borderRadius: 20, padding: '32px 28px',
          boxShadow: '0 25px 80px rgba(0,0,0,.8)',
        }}>

          {!otpPending ? (
            /* ── LOGIN FORM ── */
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(156,163,175,.5)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Email Address
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="superadmin@kairaflow.com" required disabled={loading}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(239,68,68,.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,.08)'}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(156,163,175,.5)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••" required disabled={loading}
                    style={{ ...inputStyle, paddingRight: 42 }}
                    onFocus={e => e.target.style.borderColor = 'rgba(239,68,68,.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,.08)'}
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(156,163,175,.5)', fontSize: 16 }}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              {error && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', color: '#fca5a5', fontSize: 13 }}>⚠ {error}</div>}
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                background: loading ? 'rgba(239,68,68,.4)' : 'linear-gradient(135deg, #ef4444, #b91c1c)',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 0 30px rgba(239,68,68,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {loading ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} /> Sending OTP...</> : '⚡ Continue with OTP'}
              </button>
            </form>
          ) : (
            /* ── OTP FORM ── */
            <form onSubmit={handleVerifyOtp}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <p style={{ fontSize: 13, color: 'rgba(156,163,175,.7)', margin: 0 }}>
                  Enter the 6-digit OTP sent to your email
                </p>
              </div>

              {/* OTP Boxes */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }} onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text" inputMode="numeric" maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    disabled={loading}
                    style={{
                      width: 48, height: 56, textAlign: 'center',
                      fontSize: 24, fontWeight: 800, fontFamily: 'monospace',
                      background: digit ? 'rgba(239,68,68,.12)' : 'rgba(255,255,255,.04)',
                      border: `2px solid ${digit ? 'rgba(239,68,68,.5)' : 'rgba(255,255,255,.1)'}`,
                      borderRadius: 10, color: '#fff', outline: 'none',
                      transition: 'all .15s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(239,68,68,.7)'}
                    onBlur={e => e.target.style.borderColor = otp[i] ? 'rgba(239,68,68,.5)' : 'rgba(255,255,255,.1)'}
                  />
                ))}
              </div>

              {error && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', color: '#fca5a5', fontSize: 13, textAlign: 'center' }}>⚠ {error}</div>}

              <button type="submit" disabled={loading || otp.join('').length !== 6} style={{
                width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                background: (loading || otp.join('').length !== 6) ? 'rgba(239,68,68,.3)' : 'linear-gradient(135deg, #ef4444, #b91c1c)',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: (loading || otp.join('').length !== 6) ? 'not-allowed' : 'pointer',
                boxShadow: '0 0 30px rgba(239,68,68,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {loading ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} /> Verifying...</> : '🔐 Verify & Login'}
              </button>

              {/* Resend */}
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                {resendTimer > 0 ? (
                  <p style={{ fontSize: 12, color: 'rgba(156,163,175,.5)', margin: 0 }}>
                    Resend OTP in <span style={{ color: '#ef4444', fontWeight: 700 }}>{resendTimer}s</span>
                  </p>
                ) : (
                  <button type="button" onClick={handleResend} style={{
                    background: 'none', border: 'none', color: 'rgba(239,68,68,.8)',
                    fontSize: 12, cursor: 'pointer', fontWeight: 600,
                  }}>
                    Didn't receive? Resend OTP
                  </button>
                )}
              </div>

              {/* Back to login */}
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <button type="button" onClick={() => { clearSATokens(); window.location.reload(); }} style={{
                  background: 'none', border: 'none', color: 'rgba(156,163,175,.4)',
                  fontSize: 11, cursor: 'pointer',
                }}>
                  ← Back to login
                </button>
              </div>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(156,163,175,.3)' }}>
          Restricted access — authorised personnel only
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(156,163,175,.25); }
      `}</style>
    </div>
  );
}
