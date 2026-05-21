'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { clientAPI, clientProfileAPI } from '../../../utils/api';
import { useAuth } from '../../../utils/AuthContext';
import {
  FiPlus, FiEdit2, FiTrash2, FiCopy, FiCheck, FiX,
  FiEye, FiEyeOff, FiActivity, FiDownload, FiArrowLeft, FiUser
} from 'react-icons/fi';

const ADMIN_ROLES  = ['admin', 'marketing_head', 'crm_head'];
const VIEWER_ROLES = ['admin', 'marketing_head', 'crm_head', 'team_lead'];

const EMPTY_FORM = {
  address: '', website: '', instagram: '', facebook: '',
  password: '', notes: '', status: 'active',
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="text-gray-400 hover:text-blue-500 transition" title="Copy">
      {copied ? <FiCheck size={13} className="text-green-500" /> : <FiCopy size={13} />}
    </button>
  );
}

function PasswordField({ value }: { value: string }) {
  const [show, setShow] = useState(false);
  if (!value) return <span className="text-gray-400 text-sm">—</span>;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-mono text-gray-800 dark:text-gray-200">
        {show ? value : '••••••••'}
      </span>
      <button onClick={() => setShow(!show)} className="text-gray-400 hover:text-blue-500">
        {show ? <FiEyeOff size={13} /> : <FiEye size={13} />}
      </button>
      <CopyBtn text={value} />
    </div>
  );
}

function LinkField({ value }: { value: string }) {
  if (!value) return <span className="text-gray-400 text-sm">—</span>;
  const href = value.startsWith('http') ? value : `https://${value}`;
  return (
    <div className="flex items-center gap-2">
      <a href={href} target="_blank" rel="noreferrer"
        className="text-sm text-blue-500 hover:underline truncate max-w-xs">{value}</a>
      <CopyBtn text={value} />
    </div>
  );
}

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { user } = useAuth();
  const clientId = parseInt(id);

  const isAdmin = ADMIN_ROLES.includes(user?.role || '');
  const canView = VIEWER_ROLES.includes(user?.role || '');

  const [client, setClient]             = useState<any>(null);
  const [profiles, setProfiles]         = useState<any[]>([]);
  const [showForm, setShowForm]         = useState(false);
  const [editProfile, setEditProfile]   = useState<any>(null);
  const [form, setForm]                 = useState({ ...EMPTY_FORM });
  const [saving, setSaving]             = useState(false);
  const [logsFor, setLogsFor]           = useState<number | null>(null);
  const [logs, setLogs]                 = useState<any[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    if (!canView) return;
    clientAPI.getById(clientId).then(r => setClient(r.data)).catch(() => {});
    loadProfiles();
  }, [clientId]);

  const loadProfiles = async () => {
    try { const r = await clientProfileAPI.getAll(clientId); setProfiles(r.data); } catch {}
  };

  const openAdd = () => { setForm({ ...EMPTY_FORM }); setEditProfile(null); setShowForm(true); };
  const openEdit = (p: any) => {
    setForm({
      address: p.address || '', website: p.website || '',
      instagram: p.instagram || '', facebook: p.facebook || '',
      password: p.password || '', notes: p.notes || '', status: p.status || 'active',
    });
    setEditProfile(p);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editProfile) await clientProfileAPI.update(editProfile.id, form);
      else await clientProfileAPI.create(clientId, form);
      setShowForm(false);
      loadProfiles();
    } catch {}
    finally { setSaving(false); }
  };

  const handleDelete = async (profileId: number) => {
    try { await clientProfileAPI.delete(profileId); loadProfiles(); setDeleteConfirm(null); } catch {}
  };

  const loadLogs = async (profileId: number) => {
    if (logsFor === profileId) { setLogsFor(null); return; }
    try {
      const r = await clientProfileAPI.getLogs(profileId);
      setLogs(r.data); setLogsFor(profileId);
    } catch {}
  };

  const exportCSV = () => {
    const headers = ['Address','Website','Instagram','Facebook','Password','Status','Notes','Created By','Created At','Updated By'];
    const rows = profiles.map(p => [
      p.address, p.website, p.instagram, p.facebook, p.password,
      p.status, p.notes, p.created_by_name, p.created_at, p.updated_by_name
    ].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${client?.company_name || 'client'}_profiles.csv`;
    a.click();
  };

  if (!canView) return <div className="p-8 text-gray-400">Access denied.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500">
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
              {client?.company_name || 'Client'} — Profiles
            </h1>
            <p className="text-sm text-gray-400">{profiles.length} profile(s)</p>
          </div>
        </div>
        <div className="flex gap-2">
          {profiles.length > 0 && (
            <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">
              <FiDownload size={14} /> Export CSV
            </button>
          )}
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <FiPlus size={15} /> Add Profile
          </button>
        </div>
      </div>

      {/* Profile cards */}
      {profiles.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <FiUser size={40} className="mx-auto mb-3 opacity-30" />
          <p>No profiles yet. Click "Add Profile" to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {profiles.map(p => (
            <div key={p.id} className="card">
              {/* Card top row */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs text-gray-400">
                    Added by <span className="font-medium text-gray-600 dark:text-gray-300">{p.created_by_name}</span>
                    {' · '}{p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : ''}
                    {p.updated_by_name ? ` · Edited by ${p.updated_by_name}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    p.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700'
                  }`}>{p.status}</span>

                  <button onClick={() => loadLogs(p.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition" title="Activity Log">
                    <FiActivity size={14} />
                  </button>

                  {isAdmin && (
                    <button onClick={() => openEdit(p)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition" title="Edit">
                      <FiEdit2 size={14} />
                    </button>
                  )}

                  {isAdmin && (
                    deleteConfirm === p.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-red-500">Sure?</span>
                        <button onClick={() => handleDelete(p.id)} className="p-1 text-red-500 hover:text-red-700"><FiCheck size={13} /></button>
                        <button onClick={() => setDeleteConfirm(null)} className="p-1 text-gray-400"><FiX size={13} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(p.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition" title="Delete">
                        <FiTrash2 size={14} />
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Fields grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Password</p>
                  <PasswordField value={p.password} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Website</p>
                  <LinkField value={p.website} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Instagram</p>
                  <LinkField value={p.instagram} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Facebook</p>
                  <LinkField value={p.facebook} />
                </div>
                {p.address && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Address</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{p.address}</p>
                  </div>
                )}
                {p.notes && (
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{p.notes}</p>
                  </div>
                )}
              </div>

              {/* Activity logs */}
              {logsFor === p.id && (
                <div className="mt-5 pt-4 border-t dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Activity Log</p>
                  {logs.length === 0 ? (
                    <p className="text-xs text-gray-400">No activity yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {logs.map(l => (
                        <div key={l.id} className="flex items-center gap-3 text-xs text-gray-500">
                          <span className={`px-1.5 py-0.5 rounded font-medium ${
                            l.action === 'created' ? 'bg-green-100 text-green-700' :
                            l.action === 'updated' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>{l.action}</span>
                          <span className="font-medium text-gray-600 dark:text-gray-300">{l.user_name}</span>
                          <span className="text-gray-400">{l.detail}</span>
                          <span className="ml-auto text-gray-300 whitespace-nowrap">
                            {new Date(l.created_at).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold">{editProfile ? 'Edit Profile' : 'Add Profile'}</h2>
              <button onClick={() => setShowForm(false)}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Password',    key: 'password',  type: 'text' },
                  { label: 'Website URL', key: 'website',   type: 'text' },
                  { label: 'Instagram',   key: 'instagram', type: 'text' },
                  { label: 'Facebook',    key: 'facebook',  type: 'text' },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-1">{label}</label>
                    <input type={type} value={(form as any)[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="input" />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="input h-16 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes / Additional Info</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="input h-20 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving...' : editProfile ? 'Update Profile' : 'Add Profile'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
