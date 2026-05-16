'use client';

import { useEffect, useState, useMemo } from 'react';
import { domainAPI, clientAPI } from '../../utils/api';
import { useAuth } from '../../utils/AuthContext';
import {
  FiGlobe, FiPlus, FiEdit2, FiTrash2, FiSearch,
  FiAlertCircle, FiClock, FiCheckCircle, FiX, FiRefreshCw,
} from 'react-icons/fi';

const EMPTY_FORM = {
  domain_name: '', domain_url: '', client_id: '',
  renewal_date: '', registrar: '', notes: '',
};

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

function StatusBadge({ days }: { days: number }) {
  if (days < 0)  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400">Expired {Math.abs(days)}d ago</span>;
  if (days <= 7)  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400">⚠ {days}d left</span>;
  if (days <= 30) return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">{days}d left</span>;
  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">{days}d left</span>;
}

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-up
      ${type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
      {type === 'success' ? <FiCheckCircle size={16} /> : <FiAlertCircle size={16} />}
      {msg}
      <button onClick={onClose}><FiX size={14} /></button>
    </div>
  );
}

export default function DomainsPage() {
  const { user } = useAuth();
  const canDelete = user?.role === 'admin' || user?.role === 'marketing_head';

  const [domains, setDomains]     = useState<any[]>([]);
  const [clients, setClients]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState<any>(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [saving, setSaving]       = useState(false);
  const [deleteId, setDeleteId]   = useState<number | null>(null);
  const [toast, setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type });

  const load = async () => {
    setLoading(true);
    try {
      const [d, c] = await Promise.all([
        domainAPI.getAll().catch(() => ({ data: [] })),
        clientAPI.getAll(),
      ]);
      setDomains(d.data);
      setClients(c.data);
    } catch { showToast('Failed to load data', 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return domains.filter(d =>
      !q || d.domain_name?.toLowerCase().includes(q) ||
      d.domain_url?.toLowerCase().includes(q) ||
      d.company_name?.toLowerCase().includes(q) ||
      d.registrar?.toLowerCase().includes(q)
    );
  }, [domains, search]);

  const expired    = domains.filter(d => daysUntil(d.renewal_date) < 0);
  const critical   = domains.filter(d => { const x = daysUntil(d.renewal_date); return x >= 0 && x <= 7; });
  const upcoming   = domains.filter(d => { const x = daysUntil(d.renewal_date); return x > 7 && x <= 30; });
  const needAction = expired.length + critical.length;

  const openAdd = () => { setForm({ ...EMPTY_FORM }); setEditItem(null); setShowModal(true); };
  const openEdit = (d: any) => {
    setForm({
      domain_name: d.domain_name, domain_url: d.domain_url || '',
      client_id: d.client_id || '', renewal_date: d.renewal_date,
      registrar: d.registrar || '', notes: d.notes || '',
    });
    setEditItem(d); setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, client_id: form.client_id || null };
      if (editItem) {
        await domainAPI.update(editItem.id, payload);
        showToast('Domain updated');
      } else {
        await domainAPI.create(payload);
        showToast('Domain added');
      }
      setShowModal(false);
      load();
    } catch { showToast('Failed to save domain', 'error'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await domainAPI.delete(deleteId);
      showToast('Domain deleted');
      setDeleteId(null);
      load();
    } catch { showToast('Failed to delete', 'error'); }
  };

  return (
    <div className="p-6 space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <FiGlobe className="text-primary-500" /> Domain Management
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Track domain renewals and expiration dates</p>
        </div>
        <div className="flex gap-3">
          <button onClick={load} className="btn-secondary gap-2 text-sm"><FiRefreshCw size={14} /> Refresh</button>
          <button onClick={openAdd} className="btn-primary gap-2"><FiPlus size={16} /> Add Domain</button>
        </div>
      </div>

      {/* Alert Cards */}
      {(expired.length > 0 || critical.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expired.length > 0 && (
            <div className="card border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <FiAlertCircle className="text-red-500" size={18} />
                <h3 className="font-semibold text-red-700 dark:text-red-400">Expired Domains ({expired.length})</h3>
              </div>
              <div className="space-y-1.5">
                {expired.map(d => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-red-800 dark:text-red-300">{d.domain_name}</span>
                    <span className="text-red-600 dark:text-red-400 text-xs">{d.renewal_date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {critical.length > 0 && (
            <div className="card border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <FiClock className="text-orange-500" size={18} />
                <h3 className="font-semibold text-orange-700 dark:text-orange-400">Expiring in 7 Days ({critical.length})</h3>
              </div>
              <div className="space-y-1.5">
                {critical.map(d => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-orange-800 dark:text-orange-300">{d.domain_name}</span>
                    <span className="text-orange-600 dark:text-orange-400 text-xs">{daysUntil(d.renewal_date)}d left</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Domains',    value: domains.length,    color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { label: 'Need Action',      value: needAction,        color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-500/10' },
          { label: 'Expiring (30d)',   value: upcoming.length,   color: 'text-yellow-500',  bg: 'bg-yellow-50 dark:bg-yellow-500/10' },
          { label: 'Safe',             value: domains.length - needAction - upcoming.length, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`card p-4 ${bg}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input type="text" placeholder="Search by domain, client, registrar..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="input pl-9 w-full" />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              {['Domain', 'URL', 'Client', 'Registrar', 'Renewal Date', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                {search ? 'No domains match your search.' : 'No domains added yet. Click "Add Domain" to get started.'}
              </td></tr>
            )}
            {filtered.map(d => {
              const days = daysUntil(d.renewal_date);
              const rowCls = days < 0
                ? 'bg-red-50/50 dark:bg-red-500/5'
                : days <= 7 ? 'bg-orange-50/50 dark:bg-orange-500/5' : '';
              return (
                <tr key={d.id} className={`border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors ${rowCls}`}>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{d.domain_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {d.domain_url
                      ? <a href={d.domain_url.startsWith('http') ? d.domain_url : `https://${d.domain_url}`}
                          target="_blank" rel="noreferrer"
                          className="text-primary-500 hover:underline">{d.domain_url}</a>
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{d.company_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{d.registrar || '—'}</td>
                  <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">{d.renewal_date}</td>
                  <td className="px-4 py-3"><StatusBadge days={days} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(d)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all">
                        <FiEdit2 size={14} />
                      </button>
                      {canDelete && (
                        <button onClick={() => setDeleteId(d.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                          <FiTrash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box w-full max-w-lg mx-4 p-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {editItem ? 'Edit Domain' : 'Add New Domain'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Domain Name *</label>
                  <input type="text" required className="input" placeholder="example.com"
                    value={form.domain_name} onChange={e => setForm({ ...form, domain_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Domain URL</label>
                  <input type="text" className="input" placeholder="https://example.com"
                    value={form.domain_url} onChange={e => setForm({ ...form, domain_url: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Renewal Date *</label>
                  <input type="date" required className="input"
                    value={form.renewal_date} onChange={e => setForm({ ...form, renewal_date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Registrar</label>
                  <input type="text" className="input" placeholder="GoDaddy, Namecheap..."
                    value={form.registrar} onChange={e => setForm({ ...form, registrar: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Client (Optional)</label>
                <select className="input" value={form.client_id}
                  onChange={e => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">— No Client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
                <textarea className="input h-16 resize-none" placeholder="Optional notes..."
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving...' : editItem ? 'Update Domain' : 'Add Domain'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-box w-full max-w-sm mx-4 p-8 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <FiTrash2 size={24} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Domain?</h2>
            <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="btn-primary bg-red-500 hover:bg-red-600 flex-1">Delete</button>
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
