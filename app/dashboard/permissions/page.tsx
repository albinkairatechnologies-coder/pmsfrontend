'use client';

import { useEffect, useState, useCallback } from 'react';
import { permissionAPI } from '../../utils/api';
import { useAuth } from '../../utils/AuthContext';
import { FiPlus, FiCheck, FiX, FiClock, FiUsers, FiAlertCircle } from 'react-icons/fi';

const LEAD_ROLES = ['admin', 'team_lead', 'marketing_head', 'crm_head'];

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
  rejected: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
};

const QUICK_REASONS = [
  'Medical appointment',
  'Personal work',
  'Bank / Government office',
  'Family emergency',
  'Vehicle issue',
];

export default function PermissionsPage() {
  const { user } = useAuth();
  const isLead   = LEAD_ROLES.includes(user?.role || '');

  const [tab, setTab]           = useState<'apply' | 'my' | 'admin'>('apply');
  const [myPerms, setMyPerms]   = useState<any[]>([]);
  const [pending, setPending]   = useState<any[]>([]);
  const [allPerms, setAllPerms] = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [formError, setFormError] = useState('');
  const [rejectModal, setRejectModal] = useState<number | null>(null);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    from_time: '', to_time: '', reason: '',
  });

  const loadMy      = useCallback(async () => { try { const r = await permissionAPI.getMy();     setMyPerms(r.data); } catch {} }, []);
  const loadPending = useCallback(async () => { try { const r = await permissionAPI.getPending(); setPending(r.data); } catch {} }, []);
  const loadAll     = useCallback(async () => { try { const r = await permissionAPI.getAll();     setAllPerms(r.data); } catch {} }, []);

  const reloadAdmin = useCallback(() => Promise.all([loadPending(), loadAll(), loadMy()]), [loadPending, loadAll, loadMy]);

  useEffect(() => {
    loadMy();
    if (isLead) { loadPending(); loadAll(); }
  }, []);

  useEffect(() => {
    if (tab === 'admin' && isLead) reloadAdmin();
  }, [tab]);

  const calcDuration = (from: string, to: string) => {
    if (!from || !to) return null;
    const [fh, fm] = from.split(':').map(Number);
    const [th, tm] = to.split(':').map(Number);
    const mins = (th * 60 + tm) - (fh * 60 + fm);
    if (mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (form.from_time && form.to_time) {
      const [fh, fm] = form.from_time.split(':').map(Number);
      const [th, tm] = form.to_time.split(':').map(Number);
      if (th * 60 + tm <= fh * 60 + fm) {
        setFormError('"To Time" must be after "From Time".');
        return;
      }
    }
    const today = new Date().toISOString().split('T')[0];
    if (form.date < today) {
      setFormError('Date cannot be in the past.');
      return;
    }
    setLoading(true);
    try {
      await permissionAPI.apply(form);
      setForm({ date: new Date().toISOString().split('T')[0], from_time: '', to_time: '', reason: '' });
      await loadMy();
      setTab('my');
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to submit');
    } finally { setLoading(false); }
  };

  const handleApprove = async (id: number) => {
    try {
      await permissionAPI.approve(id);
      await reloadAdmin();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleReject = async (id: number) => {
    try {
      await permissionAPI.reject(id);
      setRejectModal(null);
      await reloadAdmin();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  // ── Apply Tab ────────────────────────────────────────────────
  const ApplyView = () => (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
          <FiPlus className="text-primary-500" /> Request Permission
        </h3>
        <form onSubmit={handleApply} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date</label>
            <input type="date" value={form.date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => { setFormError(''); setForm({ ...form, date: e.target.value }); }}
              className="input" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">From Time</label>
              <input type="time" value={form.from_time}
                onChange={e => { setFormError(''); setForm({ ...form, from_time: e.target.value, to_time: '' }); }}
                className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">To Time</label>
              <input type="time" value={form.to_time}
                min={form.from_time || undefined}
                onChange={e => { setFormError(''); setForm({ ...form, to_time: e.target.value }); }}
                className="input" required />
            </div>
          </div>

          {form.from_time && form.to_time && calcDuration(form.from_time, form.to_time) && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-700 dark:text-blue-400">
              <FiClock size={14} />
              Duration: {calcDuration(form.from_time, form.to_time)}
            </div>
          )}
          {form.from_time && form.to_time && !calcDuration(form.from_time, form.to_time) && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-red-600 dark:text-red-400">
              <FiAlertCircle size={14} /> &quot;To Time&quot; must be after &quot;From Time&quot;
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Reason</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {QUICK_REASONS.map(r => (
                <button key={r} type="button"
                  onClick={() => setForm({ ...form, reason: r })}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    form.reason === r
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
            <textarea value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              className="input h-20 resize-none"
              placeholder="Or type your reason..."
              required />
          </div>

          {formError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-red-600 dark:text-red-400">
              <FiAlertCircle size={14} /> {formError}
            </div>
          )}

          <button type="submit"
            disabled={loading || !!(form.from_time && form.to_time && !calcDuration(form.from_time, form.to_time))}
            className="btn-primary w-full">
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <div className="card bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
            <FiClock size={16} /> Permission Guidelines
          </h4>
          <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
            <li className="flex items-start gap-2"><span>•</span> Permission is for short absences during work hours</li>
            <li className="flex items-start gap-2"><span>•</span> Submit at least 1 hour before the requested time</li>
            <li className="flex items-start gap-2"><span>•</span> Your team lead or admin must approve</li>
            <li className="flex items-start gap-2"><span>•</span> Excessive permissions may affect your attendance record</li>
          </ul>
        </div>

        <div className="card">
          <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Recent Requests</h4>
          {myPerms.length === 0
            ? <p className="text-gray-400 text-sm">No requests yet</p>
            : <div className="space-y-2">
                {myPerms.slice(0, 4).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm">
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-300">{p.date}</p>
                      <p className="text-xs text-gray-400">{p.from_time} → {p.to_time} · {p.duration_minutes}m</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[p.status]}`}>
                      {p.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  );

  // ── My History Tab ───────────────────────────────────────────
  const MyView = () => (
    <div className="card overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <tr>
            {['Date', 'From', 'To', 'Duration', 'Reason', 'Status', 'Approved By'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {myPerms.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No permission requests found</td></tr>
          )}
          {myPerms.map((p: any) => (
            <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/70 dark:hover:bg-gray-800/50">
              <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">{p.date}</td>
              <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300">{p.from_time}</td>
              <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300">{p.to_time}</td>
              <td className="px-4 py-3 text-blue-600 font-semibold">{p.duration_minutes}m</td>
              <td className="px-4 py-3 max-w-xs truncate text-gray-500">{p.reason}</td>
              <td className="px-4 py-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[p.status]}`}>
                  {p.status.toUpperCase()}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">{p.approved_by_name || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── Admin Tab ────────────────────────────────────────────────
  const AdminView = () => (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <FiAlertCircle className="text-yellow-500" />
            <h3 className="font-semibold text-gray-800 dark:text-white">Pending Approvals ({pending.length})</h3>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {pending.map((p: any) => (
              <div key={p.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-800 dark:text-white">{p.employee_name}</p>
                    <span className="text-xs text-gray-400">{p.team_name || p.employee_role}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{p.date}</span>
                    <span className="font-mono">{p.from_time} → {p.to_time}</span>
                    <span className="text-blue-600 font-semibold">{p.duration_minutes}m</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{p.reason}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleApprove(p.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-semibold transition-colors">
                    <FiCheck size={12} /> Approve
                  </button>
                  <button onClick={() => setRejectModal(p.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold transition-colors">
                    <FiX size={12} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div className="card text-center py-10 text-gray-400">
          <FiCheck size={32} className="mx-auto mb-2 text-green-400" />
          No pending permission requests
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-white">All Permission Requests</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {['Employee', 'Date', 'From', 'To', 'Duration', 'Reason', 'Status', 'Approved By'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allPerms.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No records</td></tr>
            )}
            {allPerms.map((p: any) => (
              <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/70 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800 dark:text-white">{p.employee_name}</p>
                  <p className="text-xs text-gray-400 capitalize">{p.employee_role?.replace(/_/g, ' ')}</p>
                </td>
                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">{p.date}</td>
                <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300">{p.from_time}</td>
                <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300">{p.to_time}</td>
                <td className="px-4 py-3 text-blue-600 font-semibold">{p.duration_minutes}m</td>
                <td className="px-4 py-3 max-w-xs truncate text-gray-500">{p.reason}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[p.status]}`}>
                    {p.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{p.approved_by_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <FiClock className="text-primary-500" /> Permissions
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Request short-time permission during work hours</p>
        </div>
        {isLead && pending.length > 0 && (
          <span className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-xl text-sm font-semibold">
            <FiAlertCircle size={14} /> {pending.length} pending
          </span>
        )}
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit mb-6">
        {[
          { key: 'apply', label: 'Request',    icon: <FiPlus size={14} /> },
          { key: 'my',    label: 'My History', icon: <FiClock size={14} /> },
          ...(isLead ? [{ key: 'admin', label: `Admin${pending.length > 0 ? ` (${pending.length})` : ''}`, icon: <FiUsers size={14} /> }] : []),
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              tab === t.key
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'apply' && <ApplyView />}
      {tab === 'my'    && <MyView />}
      {tab === 'admin' && isLead && <AdminView />}

      {/* Reject confirmation modal */}
      {rejectModal !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-modal p-6 w-full max-w-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-white mb-2">Reject Permission Request</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Are you sure you want to reject this permission request?</p>
            <div className="flex gap-3">
              <button onClick={() => handleReject(rejectModal)}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors">
                Yes, Reject
              </button>
              <button onClick={() => setRejectModal(null)}
                className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
