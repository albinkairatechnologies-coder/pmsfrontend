'use client';

import { useEffect, useState, useCallback } from 'react';
import { leaveAPI } from '../../utils/api';
import { useAuth } from '../../utils/AuthContext';
import { FiPlus, FiCheck, FiX, FiCalendar, FiClock, FiUsers, FiAlertCircle } from 'react-icons/fi';

const LEAD_ROLES = ['admin', 'team_lead', 'marketing_head', 'crm_head'];

const LEAVE_TYPES = ['sick', 'casual', 'emergency', 'annual'];

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
  rejected: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
};

const TYPE_STYLES: Record<string, string> = {
  sick:      'bg-red-100    text-red-700',
  casual:    'bg-blue-100   text-blue-700',
  emergency: 'bg-orange-100 text-orange-700',
  annual:    'bg-green-100  text-green-700',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function StatCard({ icon, label, value, color }: any) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

export default function LeavesPage() {
  const { user } = useAuth();
  const isLead   = LEAD_ROLES.includes(user?.role || '');

  const [tab, setTab]           = useState<'apply' | 'my' | 'calendar' | 'admin'>('apply');
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [pending, setPending]   = useState<any[]>([]);
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [stats, setStats]       = useState<any>({});
  const [loading, setLoading]   = useState(false);
  const [formError, setFormError] = useState('');
  const [rejectModal, setRejectModal] = useState<{ id: number; note: string } | null>(null);

  const now = new Date();
  const [calYear,  setCalYear]  = useState(String(now.getFullYear()));
  const [calMonth, setCalMonth] = useState(String(now.getMonth() + 1));

  const [form, setForm] = useState({
    leave_type: 'casual', start_date: '', end_date: '', reason: '',
  });

  const loadMy      = useCallback(async () => { try { const r = await leaveAPI.getMy();      setMyLeaves(r.data); } catch {} }, []);
  const loadPending = useCallback(async () => { try { const r = await leaveAPI.getPending();  setPending(r.data);  } catch {} }, []);
  const loadAll     = useCallback(async () => { try { const r = await leaveAPI.getAll();      setAllLeaves(r.data); } catch {} }, []);
  const loadStats   = useCallback(async () => { try { const r = await leaveAPI.getStats();    setStats(r.data);    } catch {} }, []);
  const loadCalendar = useCallback(async () => {
    try { const r = await leaveAPI.getCalendar(calYear, calMonth); setCalendar(r.data); } catch {}
  }, [calYear, calMonth]);

  useEffect(() => {
    loadMy();
    if (isLead) { loadPending(); loadAll(); loadStats(); }
  }, []);

  useEffect(() => {
    if (tab === 'calendar') loadCalendar();
    if (tab === 'admin' && isLead) { loadPending(); loadAll(); }
  }, [tab, calYear, calMonth]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    // Validate end_date >= start_date
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setFormError('End date cannot be before start date.');
      return;
    }
    setLoading(true);
    try {
      await leaveAPI.apply(form);
      setForm({ leave_type: 'casual', start_date: '', end_date: '' , reason: '' });
      await loadMy();
      setTab('my');
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to apply');
    } finally { setLoading(false); }
  };

  const handleApprove = async (id: number) => {
    try {
      await leaveAPI.approve(id);
      await Promise.all([loadPending(), loadAll(), loadStats(), loadMy()]);
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await leaveAPI.reject(rejectModal.id, rejectModal.note);
      setRejectModal(null);
      await Promise.all([loadPending(), loadAll(), loadStats(), loadMy()]);
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  // Calculate days between two dates
  const calcDays = (s: string, e: string) => {
    if (!s || !e) return 0;
    const diff = new Date(e).getTime() - new Date(s).getTime();
    return Math.max(1, Math.floor(diff / 86400000) + 1);
  };

  // ── Apply Tab ────────────────────────────────────────────────
  const applyView = (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
          <FiPlus className="text-primary-500" /> Apply for Leave
        </h3>
        <form onSubmit={handleApply} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Leave Type</label>
            <div className="grid grid-cols-2 gap-2">
              {LEAVE_TYPES.map(t => (
                <button key={t} type="button"
                  onClick={() => setForm({ ...form, leave_type: t })}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 capitalize transition-all ${
                    form.leave_type === t
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}>
                  {t === 'sick' ? '🤒' : t === 'casual' ? '🏖️' : t === 'emergency' ? '🚨' : '📅'} {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Start Date</label>
              <input type="date" value={form.start_date} min={new Date().toISOString().split('T')[0]}
                onChange={e => { setFormError(''); setForm({ ...form, start_date: e.target.value, end_date: '' }); }}
                className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">End Date</label>
              <input type="date" value={form.end_date}
                min={form.start_date || new Date().toISOString().split('T')[0]}
                onChange={e => { setFormError(''); setForm({ ...form, end_date: e.target.value }); }}
                className="input" required />
            </div>
          </div>

          {form.start_date && form.end_date && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
              form.end_date < form.start_date
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
            }`}>
              <FiCalendar size={14} />
              {form.end_date < form.start_date
                ? 'End date cannot be before start date'
                : `${calcDays(form.start_date, form.end_date)} day${calcDays(form.start_date, form.end_date) !== 1 ? 's' : ''} leave`
              }
            </div>
          )}

          {formError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-red-600 dark:text-red-400">
              <FiAlertCircle size={14} /> {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Reason</label>
            <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
              className="input h-24 resize-none" placeholder="Describe the reason for your leave..."
              required />
          </div>

          <button type="submit" disabled={loading || (form.start_date && form.end_date ? form.end_date < form.start_date : false)}
            className="btn-primary w-full">
            {loading ? 'Submitting...' : 'Submit Leave Request'}
          </button>
        </form>
      </div>

      {/* Recent leaves preview */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Recent Requests</h3>
        {myLeaves.length === 0
          ? <p className="text-gray-400 text-sm">No leave requests yet</p>
          : <div className="space-y-3">
              {myLeaves.slice(0, 5).map((l: any) => (
                <div key={l.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${TYPE_STYLES[l.leave_type]}`}>
                        {l.leave_type}
                      </span>
                      <span className="text-xs text-gray-400">{l.total_days}d</span>
                    </div>
                    <p className="text-xs text-gray-500">{l.start_date} → {l.end_date}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[l.status]}`}>
                    {l.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );

  // ── My History Tab ───────────────────────────────────────────
  const MyView = () => (
    <div className="card overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <tr>
            {['Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Approved By'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {myLeaves.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No leave requests found</td></tr>
          )}
          {myLeaves.map((l: any) => (
            <tr key={l.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/70 dark:hover:bg-gray-800/50">
              <td className="px-4 py-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${TYPE_STYLES[l.leave_type]}`}>
                  {l.leave_type}
                </span>
              </td>
              <td className="px-4 py-3 font-medium">{l.start_date}</td>
              <td className="px-4 py-3">{l.end_date}</td>
              <td className="px-4 py-3 text-center font-semibold">{l.total_days}</td>
              <td className="px-4 py-3 max-w-xs truncate text-gray-500">{l.reason}</td>
              <td className="px-4 py-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[l.status]}`}>
                  {l.status.toUpperCase()}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500 text-sm">{l.approved_by_name || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── Calendar Tab ─────────────────────────────────────────────
  const CalendarView = () => {
    const year  = parseInt(calYear);
    const month = parseInt(calMonth) - 1;
    const firstDay   = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const leaveDays: Record<string, any[]> = {};
    calendar.forEach(l => {
      const s = new Date(l.start_date);
      const e = new Date(l.end_date);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        if (d.getMonth() === month && d.getFullYear() === year) {
          const key = d.getDate().toString();
          if (!leaveDays[key]) leaveDays[key] = [];
          leaveDays[key].push(l);
        }
      }
    });

    return (
      <div className="space-y-4">
        {/* Month nav */}
        <div className="flex items-center gap-3">
          <button onClick={() => {
            const d = new Date(parseInt(calYear), parseInt(calMonth) - 2);
            setCalYear(String(d.getFullYear())); setCalMonth(String(d.getMonth() + 1));
          }} className="btn-secondary px-3 py-2">‹</button>
          <span className="font-semibold text-gray-800 dark:text-white w-36 text-center">
            {MONTHS[parseInt(calMonth) - 1]} {calYear}
          </span>
          <button onClick={() => {
            const d = new Date(parseInt(calYear), parseInt(calMonth));
            setCalYear(String(d.getFullYear())); setCalMonth(String(d.getMonth() + 1));
          }} className="btn-secondary px-3 py-2">›</button>
        </div>

        <div className="card">
          <div className="grid grid-cols-7 mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day   = i + 1;
              const leaves = leaveDays[String(day)] || [];
              const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
              return (
                <div key={day} className={`min-h-[60px] p-1.5 rounded-xl border transition-all ${
                  isToday
                    ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}>
                  <p className={`text-xs font-semibold mb-1 ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {day}
                  </p>
                  {leaves.slice(0, 2).map((l: any, li: number) => (
                    <div key={li} className={`text-xs px-1 py-0.5 rounded truncate mb-0.5 ${
                      l.status === 'approved' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
                    }`} title={`${l.employee_name} — ${l.leave_type}`}>
                      {l.employee_name?.split(' ')[0]}
                    </div>
                  ))}
                  {leaves.length > 2 && <p className="text-xs text-gray-400">+{leaves.length - 2}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200" /> Approved</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-200" /> Pending</span>
        </div>
      </div>
    );
  };

  // ── Admin Tab ────────────────────────────────────────────────
  const AdminView = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<FiClock />}       label="Pending"  value={stats.pending  || 0} color="bg-yellow-500" />
        <StatCard icon={<FiCheck />}       label="Approved" value={stats.approved || 0} color="bg-green-500" />
        <StatCard icon={<FiX />}           label="Rejected" value={stats.rejected || 0} color="bg-red-500" />
        <StatCard icon={<FiCalendar />}    label="Total"    value={stats.total    || 0} color="bg-blue-500" />
      </div>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <FiAlertCircle className="text-yellow-500" />
            <h3 className="font-semibold text-gray-800 dark:text-white">Pending Approvals ({pending.length})</h3>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {pending.map((l: any) => (
              <div key={l.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-800 dark:text-white">{l.employee_name}</p>
                    <span className="text-xs text-gray-400">{l.team_name || l.employee_role}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${TYPE_STYLES[l.leave_type]}`}>
                      {l.leave_type}
                    </span>
                    <span>{l.start_date} → {l.end_date}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{l.total_days} day{l.total_days !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 truncate">{l.reason}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleApprove(l.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-semibold transition-colors">
                    <FiCheck size={12} /> Approve
                  </button>
                  <button onClick={() => setRejectModal({ id: l.id, note: '' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold transition-colors">
                    <FiX size={12} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All leaves table */}
      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-white">All Leave Requests</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {['Employee', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Approved By'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allLeaves.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No records</td></tr>
            )}
            {allLeaves.map((l: any) => (
              <tr key={l.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/70 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800 dark:text-white">{l.employee_name}</p>
                  <p className="text-xs text-gray-400 capitalize">{l.employee_role?.replace(/_/g, ' ')}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${TYPE_STYLES[l.leave_type]}`}>
                    {l.leave_type}
                  </span>
                </td>
                <td className="px-4 py-3">{l.start_date}</td>
                <td className="px-4 py-3">{l.end_date}</td>
                <td className="px-4 py-3 text-center font-semibold">{l.total_days}</td>
                <td className="px-4 py-3 max-w-xs truncate text-gray-500">{l.reason}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[l.status]}`}>
                    {l.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-sm">{l.approved_by_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <FiCalendar className="text-primary-500" /> Leave Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Apply for leave and track your requests</p>
        </div>
        {isLead && pending.length > 0 && (
          <span className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-xl text-sm font-semibold">
            <FiAlertCircle size={14} /> {pending.length} pending approval{pending.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit mb-6">
        {[
          { key: 'apply',    label: 'Apply',    icon: <FiPlus size={14} /> },
          { key: 'my',       label: 'My Leaves', icon: <FiClock size={14} /> },
          { key: 'calendar', label: 'Calendar',  icon: <FiCalendar size={14} /> },
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

      {tab === 'apply'    && applyView}
      {tab === 'my'       && <MyView />}
      {tab === 'calendar' && <CalendarView />}
      {tab === 'admin'    && isLead && <AdminView />}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-modal p-6 w-full max-w-md border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Reject Leave Request</h3>
            <textarea
              value={rejectModal.note}
              onChange={e => setRejectModal({ ...rejectModal, note: e.target.value })}
              className="input h-24 resize-none mb-4"
              placeholder="Reason for rejection (optional)..."
            />
            <div className="flex gap-3">
              <button onClick={handleReject} className="btn-primary bg-red-500 hover:bg-red-600 flex-1">
                Confirm Reject
              </button>
              <button onClick={() => setRejectModal(null)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
