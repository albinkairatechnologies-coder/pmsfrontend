'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { superadminAPI } from '../../../utils/superadminApi';
import {
  FiArrowLeft, FiUsers, FiToggleLeft, FiToggleRight,
  FiTrash2, FiEdit2, FiPlus, FiX, FiShield,
} from 'react-icons/fi';
import Link from 'next/link';

const PLAN_COLOR: Record<string, string> = {
  trial: '#f59e0b', basic: '#3b82f6', pro: '#8b5cf6', enterprise: '#ef4444',
};

export default function OrgDetailPage() {
  const { id } = useParams();
  const router  = useRouter();
  const orgId   = Number(id);

  const [data, setData]         = useState<any>(null);
  const [users, setUsers]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<'edit' | 'admin' | null>(null);
  const [form, setForm]         = useState<any>({});
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const load = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        superadminAPI.getOrgStats(orgId),
        superadminAPI.getOrgUsers(orgId),
      ]);
      setData(statsRes.data);
      setUsers(usersRes.data);
    } catch { router.push('/superadmin/organisations'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [orgId]);

  const handleToggle = async () => {
    await superadminAPI.toggleOrg(orgId);
    load();
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${data?.organisation?.name}"? This cannot be undone.`)) return;
    await superadminAPI.deleteOrg(orgId);
    router.push('/superadmin/organisations');
  };

  const handleSaveEdit = async () => {
    setSaving(true); setError('');
    try {
      await superadminAPI.updateOrg(orgId, form);
      setModal(null); load();
    } catch (e: any) { setError(e?.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleCreateAdmin = async () => {
    setSaving(true); setError('');
    try {
      await superadminAPI.createAdmin(orgId, adminForm);
      setModal(null); load();
    } catch (e: any) { setError(e?.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleRemoveUser = async (userId: number) => {
    if (!confirm('Remove this user?')) return;
    await superadminAPI.removeUser(orgId, userId);
    load();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px',
    background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 10, fontWeight: 700,
    color: 'rgba(156,163,175,.5)', letterSpacing: '0.12em',
    textTransform: 'uppercase', marginBottom: 6,
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(239,68,68,.2)', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const org = data?.organisation;

  return (
    <div style={{ color: '#fff' }}>
      {/* Back + Header */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/superadmin/organisations" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(156,163,175,.6)', textDecoration: 'none', marginBottom: 16 }}>
          <FiArrowLeft size={13} /> Back to Organisations
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{org?.name}</h1>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${PLAN_COLOR[org?.plan] || '#888'}20`, color: PLAN_COLOR[org?.plan] || '#888', textTransform: 'capitalize' }}>{org?.plan}</span>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: org?.is_active ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)', color: org?.is_active ? '#22c55e' : '#ef4444' }}>
                {org?.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(156,163,175,.5)' }}>{org?.email} · /{org?.slug}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setForm({ name: org.name, email: org.email, phone: org.phone || '', plan: org.plan, address: org.address || '' }); setError(''); setModal('edit'); }} style={btnStyle('#f59e0b')}>
              <FiEdit2 size={13} /> Edit
            </button>
            <button onClick={() => { setAdminForm({ name: '', email: '', password: '', phone: '' }); setError(''); setModal('admin'); }} style={btnStyle('#8b5cf6')}>
              <FiPlus size={13} /> Add Admin
            </button>
            <button onClick={handleToggle} style={btnStyle(org?.is_active ? '#22c55e' : '#6b7280')}>
              {org?.is_active ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />}
              {org?.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button onClick={handleDelete} style={btnStyle('#ef4444')}>
              <FiTrash2 size={13} /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Users', value: data?.total_users ?? 0, color: '#3b82f6' },
          { label: 'Created', value: org?.created_at ? new Date(org.created_at).toLocaleDateString() : '—', color: '#22c55e' },
          { label: 'Plan', value: org?.plan?.toUpperCase() || '—', color: PLAN_COLOR[org?.plan] || '#888' },
          { label: 'Trial Ends', value: org?.trial_ends_at ? new Date(org.trial_ends_at).toLocaleDateString() : 'N/A', color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'rgba(15,23,42,.8)', border: `1px solid ${s.color}18`, borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'rgba(156,163,175,.6)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        {/* Roles Breakdown */}
        <div style={{ background: 'rgba(15,23,42,.8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Roles Breakdown</h3>
          {data?.roles_breakdown?.length === 0 && <p style={{ color: 'rgba(156,163,175,.4)', fontSize: 13 }}>No users yet</p>}
          {data?.roles_breakdown?.map((r: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', textTransform: 'capitalize' }}>{r.role.replace(/_/g, ' ')}</span>
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'rgba(99,102,241,.15)', color: '#818cf8' }}>{r.count}</span>
            </div>
          ))}
        </div>

        {/* Users Table */}
        <div style={{ background: 'rgba(15,23,42,.8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiUsers size={14} /> Users ({users.length})
            </h3>
            <button onClick={() => { setAdminForm({ name: '', email: '', password: '', phone: '' }); setError(''); setModal('admin'); }} style={{ ...btnStyle('#ef4444'), fontSize: 11 }}>
              <FiPlus size={12} /> Add Admin
            </button>
          </div>
          {users.length === 0 ? (
            <p style={{ color: 'rgba(156,163,175,.4)', fontSize: 13 }}>No users in this organisation yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                  {['Name', 'Email', 'Role', 'Team', 'Joined', ''].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(156,163,175,.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                    <td style={{ padding: '10px', fontSize: 13, color: '#fff', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {u.role === 'admin' && <FiShield size={12} color="#ef4444" />}
                        {u.name}
                      </div>
                    </td>
                    <td style={{ padding: '10px', fontSize: 12, color: 'rgba(255,255,255,.6)' }}>{u.email}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, background: 'rgba(99,102,241,.12)', color: '#818cf8' }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '10px', fontSize: 12, color: 'rgba(156,163,175,.5)' }}>{u.team_name || '—'}</td>
                    <td style={{ padding: '10px', fontSize: 11, color: 'rgba(156,163,175,.4)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '10px' }}>
                      <button onClick={() => handleRemoveUser(u.id)} style={{ padding: '4px 8px', borderRadius: 5, border: '1px solid rgba(239,68,68,.2)', background: 'rgba(239,68,68,.08)', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {modal === 'edit' && (
        <Modal title="Edit Organisation" onClose={() => setModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Name *</label>
              <input style={inputStyle} value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              <input style={inputStyle} value={form.email} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Plan</label>
              <select style={inputStyle} value={form.plan} onChange={e => setForm((f: any) => ({ ...f, plan: e.target.value }))}>
                {['trial', 'basic', 'pro', 'enterprise'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Address</label>
              <input style={inputStyle} value={form.address} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          {error && <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,.1)', color: '#fca5a5', fontSize: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button onClick={() => setModal(null)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'rgba(255,255,255,.7)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSaveEdit} disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* Add Admin Modal */}
      {modal === 'admin' && (
        <Modal title="Add Admin User" onClose={() => setModal(null)}>
          <div style={{ display: 'grid', gap: 14 }}>
            {[
              { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'John Doe' },
              { label: 'Email *', key: 'email', type: 'email', placeholder: 'admin@company.com' },
              { label: 'Password *', key: 'password', type: 'password', placeholder: 'Min 8 chars with letters & numbers' },
              { label: 'Phone', key: 'phone', type: 'text', placeholder: '+91 9999999999' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input type={f.type} style={inputStyle} placeholder={f.placeholder}
                  value={(adminForm as any)[f.key]}
                  onChange={e => setAdminForm(a => ({ ...a, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
          {error && <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,.1)', color: '#fca5a5', fontSize: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button onClick={() => setModal(null)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'rgba(255,255,255,.7)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleCreateAdmin} disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: `1px solid ${color}30`, background: `${color}12`, color, fontSize: 12, cursor: 'pointer' };
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'linear-gradient(135deg, #0f1729, #080d1a)', border: '1px solid rgba(239,68,68,.15)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 25px 80px rgba(0,0,0,.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(156,163,175,.6)', cursor: 'pointer' }}><FiX size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
