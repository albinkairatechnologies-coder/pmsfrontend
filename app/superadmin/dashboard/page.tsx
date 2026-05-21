'use client';

import { useEffect, useState, useCallback } from 'react';
import { superadminAPI } from '../../utils/superadminApi';
import { useSA } from '../SAContext';
import Link from 'next/link';
import {
  FiGrid, FiUsers, FiCheckCircle, FiAlertCircle,
  FiRefreshCw, FiPlus, FiActivity,
  FiShield, FiClock, FiBarChart2, FiMessageSquare,
} from 'react-icons/fi';

interface Stats {
  total_organisations: number;
  active_organisations: number;
  inactive_organisations: number;
  total_users: number;
  total_admins: number;
  plans_breakdown: { plan: string; count: number }[];
  top_organisations: { id: number; name: string; slug: string; plan: string; is_active: number; user_count: number }[];
  recent_organisations: { id: number; name: string; email: string; plan: string; is_active: number; created_at: string }[];
  growth: { month: string; count: number }[];
  recent_activity: { action: string; created_at: string; ip_address: string; superadmin_name: string }[];
}

const PLAN_COLOR: Record<string, string> = {
  trial: '#f59e0b', basic: '#3b82f6', pro: '#8b5cf6', enterprise: '#ef4444',
};

function RecentChatPreview() {
  const [contacts, setContacts] = useState<any[]>([]);
  useEffect(() => {
    superadminAPI.getChatContacts().then(r => setContacts(r.data.slice(0, 5))).catch(() => {});
  }, []);
  const withMsg = contacts.filter(c => c.last_message);
  if (withMsg.length === 0) return (
    <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(156,163,175,.4)' }}>
      <FiMessageSquare size={28} style={{ marginBottom: 8, opacity: .3 }} />
      <p style={{ fontSize: 13, margin: 0 }}>No messages yet. Start chatting with org admins.</p>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {withMsg.map(c => (
        <Link key={c.id} href="/superadmin/chat" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(239,68,68,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#ef4444', flexShrink: 0 }}>
            {c.org_name[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{c.org_name}</span>
              <span style={{ fontSize: 10, color: 'rgba(156,163,175,.4)' }}>{new Date(c.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(156,163,175,.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.last_message.sender_type === 'superadmin' ? 'You: ' : `${c.name}: `}{c.last_message.message}
            </div>
          </div>
          {c.unread_count > 0 && (
            <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 }}>
              {c.unread_count}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { superadmin } = useSA();
  const [stats, setStats]       = useState<Stats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(() => {
    superadminAPI.stats()
      .then(r => { setStats(r.data); setLastRefresh(new Date()); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh every 30 seconds
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const statCards = stats ? [
    { icon: <FiGrid size={20} />,        label: 'Total Organisations', value: stats.total_organisations,  sub: 'All registered',        color: '#ef4444' },
    { icon: <FiCheckCircle size={20} />, label: 'Active',              value: stats.active_organisations, sub: 'Currently running',     color: '#22c55e' },
    { icon: <FiAlertCircle size={20} />, label: 'Inactive',            value: stats.inactive_organisations, sub: 'Suspended',           color: '#f59e0b' },
    { icon: <FiUsers size={20} />,       label: 'Total Users',         value: stats.total_users,          sub: 'Across all orgs',       color: '#3b82f6' },
    { icon: <FiShield size={20} />,      label: 'Org Admins',          value: stats.total_admins,         sub: 'Admin role users',      color: '#8b5cf6' },
  ] : [];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(239,68,68,.2)', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 13, color: 'rgba(156,163,175,.6)' }}>Loading platform data...</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ color: '#fff', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
            Welcome back, {superadmin?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(156,163,175,.5)' }}>
            Platform overview · Auto-refreshes every 30s
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 11, color: 'rgba(156,163,175,.4)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <FiClock size={11} />
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <button onClick={load} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            borderRadius: 8, border: '1px solid rgba(255,255,255,.1)',
            background: 'rgba(255,255,255,.05)', color: '#fff', fontSize: 12, cursor: 'pointer',
          }}>
            <FiRefreshCw size={13} /> Refresh
          </button>
          <Link href="/superadmin/organisations" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            borderRadius: 8, border: 'none', textDecoration: 'none',
            background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
            color: '#fff', fontSize: 12, fontWeight: 700,
            boxShadow: '0 0 20px rgba(239,68,68,.2)',
          }}>
            <FiPlus size={13} /> New Organisation
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {statCards.map((c, i) => (
          <div key={i} style={{
            background: 'linear-gradient(135deg, rgba(15,23,42,.9), rgba(8,13,26,.95))',
            border: `1px solid ${c.color}20`, borderRadius: 14, padding: '20px',
            boxShadow: `0 4px 20px rgba(0,0,0,.3)`,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${c.color}18`, border: `1px solid ${c.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, marginBottom: 14 }}>
              {c.icon}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.7)', marginTop: 5 }}>{c.label}</div>
            <div style={{ fontSize: 11, color: 'rgba(156,163,175,.4)', marginTop: 3 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Recent Chat Messages */}
        <div style={{ gridColumn: '1/3', background: 'rgba(15,23,42,.8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiBarChart2 size={16} color="#ef4444" />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Recent Messages from Org Admins</h3>
            </div>
            <Link href="/superadmin/chat" style={{ fontSize: 12, color: '#ef4444', textDecoration: 'none' }}>Open Chat →</Link>
          </div>
          <RecentChatPreview />
        </div>

        {/* Plans Breakdown */}
        <div style={{ background: 'rgba(15,23,42,.8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <FiBarChart2 size={16} color="#8b5cf6" />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Plans</h3>
          </div>
          {stats?.plans_breakdown?.length === 0 && (
            <p style={{ color: 'rgba(156,163,175,.4)', fontSize: 13 }}>No organisations yet</p>
          )}
          {stats?.plans_breakdown?.map(p => {
            const pct = stats.total_organisations > 0 ? Math.round((p.count / stats.total_organisations) * 100) : 0;
            return (
              <div key={p.plan} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', textTransform: 'capitalize' }}>{p.plan}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: PLAN_COLOR[p.plan] || '#888' }}>{p.count}</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.06)' }}>
                  <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: PLAN_COLOR[p.plan] || '#888', transition: 'width .5s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

        {/* Top Organisations */}
        <div style={{ background: 'rgba(15,23,42,.8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Top Organisations</h3>
            <Link href="/superadmin/organisations" style={{ fontSize: 11, color: '#ef4444', textDecoration: 'none' }}>View all →</Link>
          </div>
          {stats?.top_organisations?.map((org, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${PLAN_COLOR[org.plan] || '#888'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: PLAN_COLOR[org.plan] || '#888' }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{org.name}</div>
                  <div style={{ fontSize: 10, color: 'rgba(156,163,175,.4)' }}>{org.user_count} users</div>
                </div>
              </div>
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: org.is_active ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)', color: org.is_active ? '#22c55e' : '#ef4444' }}>
                {org.is_active ? 'ON' : 'OFF'}
              </span>
            </div>
          ))}
          {(!stats?.top_organisations?.length) && <p style={{ color: 'rgba(156,163,175,.4)', fontSize: 13 }}>No organisations yet</p>}
        </div>

        {/* Recent Organisations */}
        <div style={{ background: 'rgba(15,23,42,.8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: 24 }}>
          <h3 style={{ margin: '0 0 18px', fontSize: 14, fontWeight: 700 }}>Recently Added</h3>
          {stats?.recent_organisations?.map((org, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{org.name}</div>
                <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700, background: `${PLAN_COLOR[org.plan] || '#888'}18`, color: PLAN_COLOR[org.plan] || '#888', textTransform: 'capitalize' }}>{org.plan}</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(156,163,175,.4)', marginTop: 3 }}>
                {org.email} · {new Date(org.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
          {(!stats?.recent_organisations?.length) && <p style={{ color: 'rgba(156,163,175,.4)', fontSize: 13 }}>No organisations yet</p>}
        </div>

        {/* Recent Activity */}
        <div style={{ background: 'rgba(15,23,42,.8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiActivity size={14} color="#22c55e" />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Live Activity</h3>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', animation: 'pulse 2s infinite' }} />
          </div>
          {stats?.recent_activity?.map((a, i) => (
            <div key={i} style={{ padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.8)' }}>
                {a.action.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(156,163,175,.4)', marginTop: 2 }}>
                {a.superadmin_name} · {new Date(a.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
          {(!stats?.recent_activity?.length) && <p style={{ color: 'rgba(156,163,175,.4)', fontSize: 13 }}>No activity yet</p>}
          <Link href="/superadmin/audit-logs" style={{ display: 'block', marginTop: 12, fontSize: 11, color: '#ef4444', textDecoration: 'none', textAlign: 'center' }}>
            View full audit log →
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
      `}</style>
    </div>
  );
}
