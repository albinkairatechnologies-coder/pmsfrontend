'use client';

import { useEffect, useState } from 'react';
import { superadminAPI } from '../../utils/superadminApi';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiToggleLeft, FiToggleRight, FiX, FiSearch } from 'react-icons/fi';
import Link from 'next/link';

interface Org {
  id: number; name: string; slug: string; email: string;
  phone: string; plan: string; is_active: number;
  user_count: number; created_at: string; trial_ends_at: string;
}

const PLAN_COLORS: Record<string, string> = {
  trial: '#f59e0b', basic: '#3b82f6', pro: '#8b5cf6', enterprise: '#ef4444',
};

const emptyForm = { name: '', email: '', phone: '', address: '', plan: 'trial', trial_ends_at: '' };

export default function OrganisationsPage() {
  const [orgs, setOrgs]           = useState<Org[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [modal, setModal]         = useState<'create' | 'edit' | 'users' | 'admin' | null>(null);
  const [selected, setSelected]   = useState<Org | null>(null);
  const [form, setForm]           = useState(emptyForm);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [users, setUsers]         = useState<any[]>([]);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const load = () => {
    setLoading(true);
    superadminAPI.getOrgs()
      .then(r => setOrgs(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.email.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setForm(emptyForm); setError(''); setModal('create'); };
  const openEdit   = (org: Org) => {
    setSelected(org);
    setForm({ name: org.name, email: org.email, phone: org.phone || '', address: '', plan: org.plan, trial_ends_at: org.trial_ends_at || '' });
    setError(''); setModal('edit');
  };
  const openUsers = async (org: Org) => {
    setSelected(org);
    const r = await superadminAPI.getOrgUsers(org.id);
    setUsers(r.data); setModal('users');
  };
  const openAdmin = (org: Org) => {
    setSelected(org);
    setAdminForm({ name: '', email: '', password: '', phone: '' });
    setError(''); setModal('admin');
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      if (modal === 'create') await superadminAPI.createOrg(form);
      else if (modal === 'edit' && selected) await superadminAPI.updateOrg(selected.id, form);
      load(); setModal(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleToggle = async (org: Org) => {
    await superadminAPI.toggleOrg(org.id);
    load();
  };

  const handleDelete = async (org: Org) => {
    if (!confirm(`Delete "${org.name}"? This cannot be undone.`)) return;
    await superadminAPI.deleteOrg(org.id);
    load();
  };

  const handleCreateAdmin = async () => {
    if (!selected) return;
    setSaving(true); setError('');
    try {
      await superadminAPI.createAdmin(selected.id, adminForm);
      setModal(null);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to create admin');
    } finally { setSaving(false); }
  };

  const handleRemoveUser = async (userId: number) => {
    if (!selected || !confirm('Remove this user?')) return;
    await superadminAPI.removeUser(selected.id, userId);
    const r = await superadminAPI.getOrgUsers(selected.id);
    setUsers(r.data);
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

  return (
    <div style={{ color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Organisations</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(156,163,175,.6)' }}>{orgs.length} total organisations</p>
        </div>
        <button onClick={openCreate} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
          borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
          color: '#fff', fontSize: 13, fontWeight: 700,
          boxShadow: '0 0 20px rgba(239,68,68,.2)',
        }}>
          <FiPlus size={16} /> New Organisation
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 360 }}>
        <FiSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(156,163,175,.5)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organisations..."
          style={{ ...inputStyle, paddingLeft: 36 }} />
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(15,23,42,.8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              {['Organisation', 'Email', 'Plan', 'Users', 'Status', 'Created', 'Actions'].map(h => (
                <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(156,163,175,.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'rgba(156,163,175,.5)' }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'rgba(156,163,175,.5)' }}>No organisations found</td></tr>
            ) : filtered.map(org => (
              <tr key={org.id} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                    <Link href={`/superadmin/organisations/${org.id}`} style={{ color: '#fff', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#fff')}
                    >{org.name}</Link>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(156,163,175,.5)', marginTop: 2 }}>/{org.slug}</div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: 'rgba(255,255,255,.7)' }}>{org.email}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: `${PLAN_COLORS[org.plan]}22`, color: PLAN_COLORS[org.plan],
                    border: `1px solid ${PLAN_COLORS[org.plan]}33`, textTransform: 'capitalize',
                  }}>{org.plan}</span>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: 'rgba(255,255,255,.7)' }}>{org.user_count}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: org.is_active ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)',
                    color: org.is_active ? '#22c55e' : '#ef4444',
                  }}>{org.is_active ? 'Active' : 'Inactive'}</span>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: 'rgba(156,163,175,.5)' }}>
                  {new Date(org.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button title="Manage Users" onClick={() => openUsers(org)} style={btnStyle('#3b82f6')}><FiUsers size={13} /></button>
                    <button title="Add Admin" onClick={() => openAdmin(org)} style={btnStyle('#8b5cf6')}>+ Admin</button>
                    <button title="Edit" onClick={() => openEdit(org)} style={btnStyle('#f59e0b')}><FiEdit2 size={13} /></button>
                    <button title={org.is_active ? 'Deactivate' : 'Activate'} onClick={() => handleToggle(org)} style={btnStyle(org.is_active ? '#22c55e' : '#6b7280')}>
                      {org.is_active ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />}
                    </button>
                    <button title="Delete" onClick={() => handleDelete(org)} style={btnStyle('#ef4444')}><FiTrash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'New Organisation' : 'Edit Organisation'} onClose={() => setModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Organisation Name *</label>
              <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Acme Corp" />
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              <input style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@acme.com" />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 9999999999" />
            </div>
            <div>
              <label style={labelStyle}>Plan</label>
              <select style={{ ...inputStyle }} value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                {['trial', 'basic', 'pro', 'enterprise'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Trial Ends At</label>
              <input type="date" style={inputStyle} value={form.trial_ends_at} onChange={e => setForm(f => ({ ...f, trial_ends_at: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Address</label>
              <input style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Street, City" />
            </div>
          </div>
          {error && <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: '#fca5a5', fontSize: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button onClick={() => setModal(null)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'rgba(255,255,255,.7)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'Saving...' : modal === 'create' ? 'Create' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* Users Modal */}
      {modal === 'users' && selected && (
        <Modal title={`Users — ${selected.name}`} onClose={() => setModal(null)} wide>
          {users.length === 0 ? (
            <p style={{ color: 'rgba(156,163,175,.5)', fontSize: 13 }}>No users in this organisation yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                  {['Name', 'Email', 'Role', 'Team', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(156,163,175,.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#fff' }}>{u.name}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'rgba(255,255,255,.6)' }}>{u.email}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, background: 'rgba(99,102,241,.15)', color: '#818cf8' }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'rgba(156,163,175,.5)' }}>{u.team_name || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={() => handleRemoveUser(u.id)} style={{ ...btnStyle('#ef4444'), fontSize: 11 }}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(156,163,175,.5)' }}>{users.length} users total</span>
            <button onClick={() => { setModal(null); openAdmin(selected); }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              + Add Admin
            </button>
          </div>
        </Modal>
      )}

      {/* Create Admin Modal */}
      {modal === 'admin' && selected && (
        <Modal title={`Add Admin — ${selected.name}`} onClose={() => setModal(null)}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input style={inputStyle} value={adminForm.name} onChange={e => setAdminForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" />
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              <input style={inputStyle} value={adminForm.email} onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@company.com" />
            </div>
            <div>
              <label style={labelStyle}>Password *</label>
              <input type="password" style={inputStyle} value={adminForm.password} onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 chars with letters & numbers" />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} value={adminForm.phone} onChange={e => setAdminForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 9999999999" />
            </div>
          </div>
          {error && <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: '#fca5a5', fontSize: 12 }}>{error}</div>}
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
  return {
    padding: '5px 10px', borderRadius: 6, border: `1px solid ${color}33`,
    background: `${color}15`, color, fontSize: 12, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 4,
  };
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{
        background: 'linear-gradient(135deg, #0f1729 0%, #080d1a 100%)',
        border: '1px solid rgba(239,68,68,.15)', borderRadius: 16,
        padding: 28, width: '100%', maxWidth: wide ? 700 : 480,
        maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 25px 80px rgba(0,0,0,.8)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(156,163,175,.6)', cursor: 'pointer', padding: 4 }}><FiX size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
