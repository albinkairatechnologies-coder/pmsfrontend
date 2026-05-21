'use client';

import { useEffect, useState } from 'react';
import { superadminAPI } from '../../utils/superadminApi';
import { FiRefreshCw } from 'react-icons/fi';

interface Log {
  id: number; action: string; target_type: string; target_id: number;
  details: any; ip_address: string; created_at: string;
  superadmin_name: string; superadmin_email: string;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: '#22c55e',
  CREATE_ORGANISATION: '#3b82f6',
  UPDATE_ORGANISATION: '#f59e0b',
  DELETE_ORGANISATION: '#ef4444',
  ACTIVATE_ORGANISATION: '#22c55e',
  DEACTIVATE_ORGANISATION: '#ef4444',
  CREATE_ORG_ADMIN: '#8b5cf6',
  DELETE_ORG_USER: '#ef4444',
};

export default function AuditLogsPage() {
  const [logs, setLogs]       = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    superadminAPI.auditLogs({ limit: 100 })
      .then(r => setLogs(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Audit Logs</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(156,163,175,.6)' }}>All superadmin actions are recorded here</p>
        </div>
        <button onClick={load} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px',
          borderRadius: 10, border: '1px solid rgba(255,255,255,.1)',
          background: 'rgba(255,255,255,.05)', color: '#fff', fontSize: 13, cursor: 'pointer',
        }}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={{ background: 'rgba(15,23,42,.8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              {['Time', 'Admin', 'Action', 'Target', 'IP Address'].map(h => (
                <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(156,163,175,.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'rgba(156,163,175,.5)' }}>Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'rgba(156,163,175,.5)' }}>No audit logs yet</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(156,163,175,.6)', whiteSpace: 'nowrap' }}>
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{log.superadmin_name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(156,163,175,.5)' }}>{log.superadmin_email}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: `${ACTION_COLORS[log.action] || '#888'}18`,
                    color: ACTION_COLORS[log.action] || '#888',
                    border: `1px solid ${ACTION_COLORS[log.action] || '#888'}30`,
                  }}>{log.action.replace(/_/g, ' ')}</span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,.6)' }}>
                  {log.target_type ? `${log.target_type} #${log.target_id}` : '—'}
                  {log.details && (
                    <div style={{ fontSize: 11, color: 'rgba(156,163,175,.4)', marginTop: 2 }}>
                      {typeof log.details === 'object' ? JSON.stringify(log.details).slice(0, 60) : log.details}
                    </div>
                  )}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(156,163,175,.5)', fontFamily: 'monospace' }}>
                  {log.ip_address || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
