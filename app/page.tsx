'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from './utils/AuthContext';
import { useRouter } from 'next/navigation';

type Stage = 'idle' | 'spinning' | 'unlocking' | 'opening' | 'done' | 'error';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [stage, setStage]       = useState<Stage>('idle');
  const { login, user }         = useAuth();
  const router                  = useRouter();
  const dialRef                 = useRef<HTMLDivElement>(null);
  const doorRef                 = useRef<HTMLDivElement>(null);
  const dialAngle               = useRef(0);
  const rafRef                  = useRef<number>(0);

  useEffect(() => { if (user) router.push('/dashboard'); }, [user]);

  // Spin the dial continuously while spinning stage is active
  useEffect(() => {
    if (stage !== 'spinning') return;
    let speed = 0;
    let angle = dialAngle.current;
    let acc = true;
    const animate = () => {
      if (acc) { speed = Math.min(speed + 0.4, 14); }
      angle += speed;
      dialAngle.current = angle;
      if (dialRef.current) dialRef.current.style.transform = `rotate(${angle}deg)`;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stage]);

  // Decelerate dial when unlocking
  useEffect(() => {
    if (stage !== 'unlocking') return;
    let speed = 14;
    let angle = dialAngle.current;
    const animate = () => {
      speed = Math.max(speed - 0.35, 0);
      angle += speed;
      dialAngle.current = angle;
      if (dialRef.current) dialRef.current.style.transform = `rotate(${angle}deg)`;
      if (speed > 0) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setStage('opening');
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stage]);

  // After opening animation completes, navigate
  useEffect(() => {
    if (stage !== 'opening') return;
    const t = setTimeout(() => setStage('done'), 1200);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage === 'done') router.push('/dashboard');
  }, [stage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stage === 'spinning' || stage === 'unlocking' || stage === 'opening') return;
    setError('');
    setStage('spinning');
    // Spin for 1.6s then attempt login
    await new Promise(r => setTimeout(r, 1600));
    try {
      await login(email, password);
      setStage('unlocking');
    } catch (err: any) {
      cancelAnimationFrame(rafRef.current);
      setStage('error');
      setError(err.response?.data?.error || 'Invalid credentials');
      // Shake then reset
      setTimeout(() => setStage('idle'), 2000);
    }
  };

  const isLocked  = stage === 'idle' || stage === 'error';
  const isOpening = stage === 'opening' || stage === 'done';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse 120% 80% at 50% 0%, #1a1035 0%, #0a0a14 60%, #000 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
      overflow: 'hidden', position: 'relative',
    }}>

      {/* Ambient background orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', left: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,200,66,.07) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      {/* Brand */}
      <div style={{ textAlign: 'center', marginBottom: 32, position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 12, letterSpacing: '0.2em', color: 'rgba(99,102,241,.8)', marginBottom: 8, textTransform: 'uppercase' }}>
          ◆ KairaFlow PMS
        </div>
        <h1 style={{
          margin: 0, fontSize: 32, fontWeight: 900,
          background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,.6) 50%, #F5C842 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>Secure Access</h1>
      </div>

      {/* ── VAULT ─────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 2, marginBottom: 32 }}>

        {/* Vault body */}
        <div style={{
          width: 220, height: 220,
          borderRadius: 24,
          background: 'linear-gradient(145deg, #2a2a3e 0%, #1a1a2e 50%, #111120 100%)',
          border: '3px solid rgba(99,102,241,.3)',
          boxShadow: '0 0 60px rgba(99,102,241,.15), 0 20px 60px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>

          {/* Vault door that swings open */}
          <div ref={doorRef} style={{
            position: 'absolute', inset: 0, borderRadius: 21,
            background: 'linear-gradient(145deg, #3a3a5c 0%, #252540 50%, #1e1e38 100%)',
            border: '2px solid rgba(99,102,241,.2)',
            transformOrigin: 'left center',
            transform: isOpening ? 'perspective(600px) rotateY(-110deg)' : 'perspective(600px) rotateY(0deg)',
            transition: isOpening ? 'transform 1.1s cubic-bezier(.4,0,.2,1)' : 'none',
            zIndex: 3,
            boxShadow: 'inset -4px 0 12px rgba(0,0,0,.4)',
          }}>
            {/* Door bolts */}
            {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy], i) => (
              <div key={i} style={{
                position: 'absolute',
                left: dx === -1 ? 12 : 'auto', right: dx === 1 ? 12 : 'auto',
                top:  dy === -1 ? 12 : 'auto', bottom: dy === 1 ? 12 : 'auto',
                width: 14, height: 14, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #4338ca)',
                boxShadow: '0 0 8px rgba(99,102,241,.5)',
              }} />
            ))}

            {/* Dial on door */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Dial outer ring */}
              <div style={{
                width: 110, height: 110, borderRadius: '50%',
                background: 'linear-gradient(145deg, #4a4a6a, #2a2a45)',
                border: '3px solid rgba(99,102,241,.4)',
                boxShadow: '0 0 20px rgba(99,102,241,.2), inset 0 2px 4px rgba(0,0,0,.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                {/* Tick marks */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    width: 2, height: i % 3 === 0 ? 10 : 6,
                    background: i % 3 === 0 ? 'rgba(245,200,66,.8)' : 'rgba(255,255,255,.2)',
                    borderRadius: 1,
                    top: 4,
                    left: '50%',
                    transformOrigin: '50% 47px',
                    transform: `translateX(-50%) rotate(${i * 30}deg)`,
                  }} />
                ))}

                {/* Spinning dial inner */}
                <div ref={dialRef} style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'linear-gradient(145deg, #5a5a8a, #3a3a60)',
                  border: '2px solid rgba(99,102,241,.5)',
                  boxShadow: '0 0 15px rgba(99,102,241,.3), inset 0 2px 4px rgba(0,0,0,.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                  transition: stage === 'idle' || stage === 'error' ? 'transform .3s ease' : 'none',
                }}>
                  {/* Dial grip lines */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} style={{
                      position: 'absolute',
                      width: 1.5, height: 22,
                      background: 'rgba(255,255,255,.12)',
                      borderRadius: 1,
                      top: '50%', left: '50%',
                      transformOrigin: '0 0',
                      transform: `translate(-50%, -50%) rotate(${i * 45}deg)`,
                    }} />
                  ))}
                  {/* Center dot */}
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: stage === 'spinning' || stage === 'unlocking'
                      ? 'linear-gradient(135deg, #F5C842, #f59e0b)'
                      : isOpening
                      ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                      : stage === 'error'
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : 'linear-gradient(135deg, #6366f1, #4338ca)',
                    boxShadow: stage === 'spinning' || stage === 'unlocking'
                      ? '0 0 12px rgba(245,200,66,.8)'
                      : isOpening
                      ? '0 0 12px rgba(34,197,94,.8)'
                      : stage === 'error'
                      ? '0 0 12px rgba(239,68,68,.8)'
                      : '0 0 8px rgba(99,102,241,.6)',
                    transition: 'all .4s ease',
                  }} />
                </div>

                {/* Dial pointer (fixed, at top) */}
                <div style={{
                  position: 'absolute', top: -2, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0, height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '10px solid #F5C842',
                  filter: 'drop-shadow(0 0 4px rgba(245,200,66,.8))',
                }} />
              </div>
            </div>

            {/* Handle */}
            <div style={{
              position: 'absolute', right: -14, top: '50%',
              transform: `translateY(-50%) ${isOpening ? 'rotate(-30deg)' : 'rotate(0deg)'}`,
              transition: isOpening ? 'transform .5s ease .2s' : 'none',
            }}>
              <div style={{
                width: 28, height: 52, borderRadius: 14,
                background: 'linear-gradient(180deg, #6366f1, #4338ca)',
                border: '2px solid rgba(99,102,241,.5)',
                boxShadow: '0 0 12px rgba(99,102,241,.4)',
              }} />
            </div>
          </div>

          {/* Inside vault — shown when door opens */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 21,
            background: 'radial-gradient(circle at 40% 50%, #0d2a1a 0%, #050f0a 100%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            zIndex: 2,
          }}>
            <div style={{ fontSize: 36, filter: 'drop-shadow(0 0 12px rgba(34,197,94,.6))' }}>✓</div>
            <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 700, letterSpacing: '0.1em' }}>ACCESS GRANTED</div>
          </div>

        </div>

        {/* Status text below vault */}
        <div style={{ textAlign: 'center', marginTop: 12, height: 20 }}>
          {stage === 'spinning' && (
            <span style={{ fontSize: 12, color: 'rgba(245,200,66,.8)', letterSpacing: '0.1em', animation: 'pulse 1s ease-in-out infinite' }}>
              ◌ VERIFYING...
            </span>
          )}
          {stage === 'unlocking' && (
            <span style={{ fontSize: 12, color: 'rgba(245,200,66,.9)', letterSpacing: '0.1em' }}>
              ◎ UNLOCKING...
            </span>
          )}
          {isOpening && (
            <span style={{ fontSize: 12, color: '#22c55e', letterSpacing: '0.1em', fontWeight: 700 }}>
              ✦ ACCESS GRANTED
            </span>
          )}
          {stage === 'error' && (
            <span style={{ fontSize: 12, color: '#ef4444', letterSpacing: '0.1em', animation: 'shake .4s ease' }}>
              ✕ ACCESS DENIED
            </span>
          )}
        </div>
      </div>

      {/* ── FORM ──────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', maxWidth: 360, padding: '0 20px',
        opacity: isOpening ? 0 : 1,
        transform: isOpening ? 'translateY(10px)' : 'translateY(0)',
        transition: 'opacity .4s ease, transform .4s ease',
        pointerEvents: isOpening ? 'none' : 'auto',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(20,20,40,.95) 0%, rgba(10,10,20,.98) 100%)',
          border: '1px solid rgba(99,102,241,.2)',
          borderRadius: 20,
          padding: '28px 24px',
          boxShadow: '0 20px 60px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.04)',
        }}>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(156,163,175,.6)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7 }}>
                Email
              </label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@kairatech.com"
                required
                disabled={!isLocked}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '11px 14px',
                  background: 'rgba(255,255,255,.04)',
                  border: `1px solid ${stage === 'error' ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.08)'}`,
                  borderRadius: 10, color: '#fff', fontSize: 14,
                  outline: 'none', transition: 'border-color .2s, box-shadow .2s',
                  opacity: !isLocked ? .5 : 1,
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,.1)'; }}
                onBlur={e  => { e.target.style.borderColor = stage === 'error' ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.08)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(156,163,175,.6)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  disabled={!isLocked}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '11px 40px 11px 14px',
                    background: 'rgba(255,255,255,.04)',
                    border: `1px solid ${stage === 'error' ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.08)'}`,
                    borderRadius: 10, color: '#fff', fontSize: 14,
                    outline: 'none', transition: 'border-color .2s, box-shadow .2s',
                    opacity: !isLocked ? .5 : 1,
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,.1)'; }}
                  onBlur={e  => { e.target.style.borderColor = stage === 'error' ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.08)'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(156,163,175,.5)', fontSize: 15, padding: 0 }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '9px 12px', borderRadius: 8, marginBottom: 14,
                background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
                color: '#fca5a5', fontSize: 12, animation: 'shake .4s ease',
              }}>
                ⚠ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!isLocked}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: stage === 'error'
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: !isLocked ? 'not-allowed' : 'pointer',
                opacity: !isLocked ? .6 : 1,
                boxShadow: '0 0 24px rgba(99,102,241,.35)',
                transition: 'all .2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {stage === 'spinning' || stage === 'unlocking' ? (
                <>
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
                  Unlocking vault...
                </>
              ) : stage === 'error' ? '✕ Try Again' : '🔐 Unlock Vault'}
            </button>
          </form>
          
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button 
              onClick={() => router.push('/register')}
              style={{
                background: 'none', border: 'none', color: 'rgba(99,102,241,.8)',
                fontSize: 12, cursor: 'pointer', fontWeight: 600,
                textDecoration: 'none', transition: 'color .2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(99,102,241,.8)'}
            >
              Don't have an account? Create one here
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes pulse   { 0%,100% { opacity:.6; } 50% { opacity:1; } }
        @keyframes shake   {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-6px); }
          40%     { transform: translateX(6px); }
          60%     { transform: translateX(-4px); }
          80%     { transform: translateX(4px); }
        }
        input::placeholder { color: rgba(156,163,175,.3); }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px rgba(20,20,40,.95) inset !important;
          -webkit-text-fill-color: #fff !important;
        }
      `}</style>
    </div>
  );
}
