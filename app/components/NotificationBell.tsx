'use client';

import { useState, useEffect, useRef } from 'react';
import { FiBell } from 'react-icons/fi';
import { notificationAPI, domainAPI } from '../utils/api';
import { useAuth } from '../utils/AuthContext';

const TYPE_COLORS: Record<string, string> = {
  leave_approved:      'text-emerald-400',
  leave_rejected:      'text-red-400',
  leave_request:       'text-blue-400',
  permission_approved: 'text-emerald-400',
  permission_rejected: 'text-red-400',
  permission_request:  'text-blue-400',
  review_scheduled:    'text-yellow-400',
  review_completed:    'text-purple-400',
  feedback:            'text-pink-400',
  domain_expired:      'text-red-400',
  domain_critical:     'text-orange-400',
};

const DOMAIN_ROLES = ['admin', 'crm_head', 'marketing_head', 'team_lead'];

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen]                   = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [domainAlerts, setDomainAlerts]   = useState<any[]>([]);
  const [unread, setUnread]               = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const lastUnreadRef = useRef(0);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setHasPermission(true);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          setHasPermission(permission === 'granted');
        });
      }
    }
  }, []);

  const triggerDesktopNotification = (title: string, body: string) => {
    if (hasPermission) {
      new Notification(title, {
        body,
        icon: '/favicon.ico', // Adjust if you have a specific icon
      });
    }
  };

  const loadDomainAlerts = async () => {
    if (!user || !DOMAIN_ROLES.includes(user.role)) return;
    try {
      const res = await domainAPI.getAlerts();
      const alerts: any[] = [];
      res.data.expired.forEach((d: any) => alerts.push({
        id: `domain_exp_${d.id}`, type: 'domain_expired', is_read: 0,
        title: `🔴 Domain Expired: ${d.domain_name}`,
        message: `Expired on ${d.renewal_date}`,
        created_at: new Date().toISOString(),
      }));
      res.data.critical.forEach((d: any) => alerts.push({
        id: `domain_crit_${d.id}`, type: 'domain_critical', is_read: 0,
        title: `⚠ Expiring Soon: ${d.domain_name}`,
        message: `Renews on ${d.renewal_date}`,
        created_at: new Date().toISOString(),
      }));
      setDomainAlerts(alerts);
    } catch { /* ignore */ }
  };

  const load = async () => {
    try {
      const [nRes, cRes] = await Promise.all([
        notificationAPI.getAll(),
        notificationAPI.getUnreadCount(),
      ]);
      
      const newCount = cRes.data.count;
      const prevCount = lastUnreadRef.current;

      // Detect new notifications
      if (newCount > prevCount && nRes.data.length > 0) {
        const latest = nRes.data[0];
        if (!latest.is_read) {
          triggerDesktopNotification(latest.title, latest.message);
        }
      }

      setNotifications(nRes.data);
      setUnread(newCount);
      lastUnreadRef.current = newCount;
    } catch { /* ignore */ }
    loadDomainAlerts();
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => { setOpen(o => !o); if (!open) load(); };

  const markRead = async (id: number) => {
    await notificationAPI.markRead(id);
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    setUnread(u => Math.max(0, u - 1));
  };

  const markAll = async () => {
    await notificationAPI.markAllRead();
    setNotifications(ns => ns.map(n => ({ ...n, is_read: 1 })));
    setUnread(0);
  };

  const totalUnread      = unread + domainAlerts.length;
  const allNotifications = [...domainAlerts, ...notifications];
  const hasDomainAlert   = domainAlerts.length > 0;

  return (
    <div ref={ref} className="relative">
      <button onClick={handleOpen}
        className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all">
        <FiBell size={18} />
        {totalUnread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center font-bold"
            style={hasDomainAlert
              ? { background: '#EF4444', boxShadow: '0 0 8px rgba(239,68,68,.6)' }
              : { background: 'linear-gradient(135deg, #F5C842, #D97706)', boxShadow: '0 0 8px rgba(245,200,66,.6)' }}>
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-[#1e1e2e] border border-white/10 rounded-2xl shadow-modal z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-primary-400 hover:text-primary-300">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {allNotifications.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-8">No notifications</p>
            ) : allNotifications.map(n => (
              <div key={n.id}
                onClick={() => typeof n.id === 'number' && !n.is_read && markRead(n.id)}
                className={`px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${
                  !n.is_read ? (n.type?.startsWith('domain') ? 'bg-red-500/10' : 'bg-primary-500/5') : ''
                }`}>
                <div className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    !n.is_read ? (n.type?.startsWith('domain') ? 'bg-red-400' : 'bg-primary-400') : 'bg-transparent'
                  }`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${TYPE_COLORS[n.type] || 'text-white'}`}>{n.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-xs text-gray-600 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
