'use client';

import { SAProvider, useSA } from './SAContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { superadminAPI } from '../utils/superadminApi';
import {
  FiHome, FiGrid, FiUsers, FiActivity,
  FiLogOut, FiShield, FiList, FiMessageSquare,
} from 'react-icons/fi';

function SALayout({ children }: { children: React.ReactNode }) {
  const { superadmin, loading, logout } = useSA();
  const router   = useRouter();
  const pathname = usePathname();
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    if (!loading && !superadmin && pathname !== '/superadmin') {
      router.push('/superadmin');
    }
  }, [loading, superadmin, pathname]);

  // Poll unread chat count
  useEffect(() => {
    if (!superadmin) return;
    const load = async () => {
      try {
        const r = await superadminAPI.getChatContacts();
        const total = r.data.reduce((s: number, c: any) => s + (c.unread_count || 0), 0);
        setChatUnread(total);
      } catch {}
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [superadmin]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080d1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(239,68,68,.2)', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (pathname === '/superadmin') return <>{children}</>;
  if (!superadmin) return null;

  const navItems = [
    { href: '/superadmin/dashboard',       icon: FiHome,         label: 'Dashboard' },
    { href: '/superadmin/organisations',   icon: FiGrid,         label: 'Organisations' },
    { href: '/superadmin/chat',            icon: FiMessageSquare, label: 'Chat' },
    { href: '/superadmin/audit-logs',      icon: FiList,         label: 'Audit Logs' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080d1a', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Sidebar */}
      <div style={{
        width: 240, background: 'linear-gradient(180deg, #0f1729 0%, #080d1a 100%)',
        borderRight: '1px solid rgba(239,68,68,.1)', display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, height: '100vh',
      }}>
        {/* Brand */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(239,68,68,.3)',
            }}>
              <span style={{ fontSize: 16 }}>⚡</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>KairaFlow</div>
              <div style={{ fontSize: 10, color: 'rgba(239,68,68,.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Super Admin</div>
            </div>
          </div>
          {/* Admin info */}
          <div style={{
            padding: '10px 12px', borderRadius: 10,
            background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.1)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{superadmin.name}</div>
            <div style={{ fontSize: 11, color: 'rgba(156,163,175,.6)', marginTop: 2 }}>{superadmin.email}</div>
            <div style={{
              marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 6,
              background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)',
              fontSize: 10, fontWeight: 700, color: '#ef4444', letterSpacing: '0.08em',
            }}>
              <FiShield size={9} /> SUPERADMIN
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, marginBottom: 2,
                textDecoration: 'none', fontSize: 13, fontWeight: 500,
                color: isActive ? '#fff' : 'rgba(156,163,175,.7)',
                background: isActive ? 'rgba(239,68,68,.12)' : 'transparent',
                border: isActive ? '1px solid rgba(239,68,68,.2)' : '1px solid transparent',
                transition: 'all .15s',
              }}>
                <Icon size={16} color={isActive ? '#ef4444' : undefined} />
                {item.label}
                {item.label === 'Chat' && chatUnread > 0 && (
                  <span style={{ marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                    {chatUnread}
                  </span>
                )}
                {isActive && !(item.label === 'Chat' && chatUnread > 0) && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
          <button onClick={() => { logout(); router.push('/superadmin'); }} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '10px 12px', borderRadius: 10, border: 'none',
            background: 'transparent', color: 'rgba(239,68,68,.7)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <FiLogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main */}
      <main style={{ marginLeft: 240, flex: 1, minHeight: '100vh', padding: '32px 32px' }}>
        {children}
      </main>
    </div>
  );
}

export default function SuperAdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <SAProvider>
      <SALayout>{children}</SALayout>
    </SAProvider>
  );
}
