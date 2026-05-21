'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '../utils/AuthContext';
import { activityAPI } from '../utils/api';

const IDLE_THRESHOLD_SEC = 60;      // mark idle after 60s no input
const SEND_INTERVAL_SEC  = 30;      // heartbeat every 30s
const IDLE_WARN_SEC      = 600;     // show warning after 10 min idle

export default function ActivityTracker() {
  const { user } = useAuth();
  const lastActivity  = useRef(Date.now());
  const buffer        = useRef<{ type: string; ts: number; duration: number }[]>([]);
  const warnedRef     = useRef(false);
  const intervalRef   = useRef<any>(null);

  useEffect(() => {
    if (!user || user.role === 'client') return;

    const record = (type: 'mouse' | 'keyboard') => {
      const now = Date.now();
      buffer.current.push({ type, ts: now, duration: 1 });
      lastActivity.current = now;
      warnedRef.current    = false;
      // Dismiss idle warning if it was shown
      window.dispatchEvent(new CustomEvent('activity-resumed'));
    };

    const onMouseMove = () => record('mouse');
    const onKeyDown   = () => record('keyboard');

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown',   onKeyDown);

    // Flush + send heartbeat every 30s
    intervalRef.current = setInterval(async () => {
      const idleSec  = Math.floor((Date.now() - lastActivity.current) / 1000);
      const status   = idleSec >= IDLE_THRESHOLD_SEC ? 'idle' : 'active';
      const events   = buffer.current.splice(0);   // drain buffer

      try {
        await activityAPI.heartbeat({ status, idle_seconds: idleSec, events });
      } catch {}

      // Fire idle warning at 10 min
      if (idleSec >= IDLE_WARN_SEC && !warnedRef.current) {
        warnedRef.current = true;
        window.dispatchEvent(new CustomEvent('idle-warning', { detail: { idleSec } }));
      }
    }, SEND_INTERVAL_SEC * 1000);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('keydown',   onKeyDown);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);

  return null;
}
