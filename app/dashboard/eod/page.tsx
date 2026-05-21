'use client';

import { useEffect, useState } from 'react';
import { eodAPI, authAPI } from '../../utils/api';
import { useAuth } from '../../utils/AuthContext';
import { FiCalendar, FiUser, FiClock, FiEdit2, FiChevronDown, FiChevronUp, FiX, FiCheck, FiFilter } from 'react-icons/fi';

const ADMIN_ROLES = ['admin', 'team_lead', 'crm_head', 'marketing_head'];

// IST date to match how worklogs are saved
const todayIST = () => {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return ist.toISOString().split('T')[0];
};

const fmt = (t: string) => {
  if (!t) return '-';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'p.m.' : 'a.m.';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};

function EODView({ report }: { report: any }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm text-gray-800 dark:text-gray-200 space-y-3">
      <p className="font-bold text-base">📋 EOD Report — {report.report_date}</p>
      {report.login_time && <p>🕐 <span className="font-medium">Login Time:</span> {fmt(report.login_time)}</p>}
      {report.logout_time && <p>🕐 <span className="font-medium">Logout Time:</span> {fmt(report.logout_time)}</p>}
      {(report.login_time || report.logout_time) && <hr className="border-gray-200 dark:border-gray-700" />}
      {report.entries?.length > 0 ? report.entries.map((en: any, i: number) => (
        <div key={i} className="space-y-1">
          <p className="font-semibold text-blue-600 dark:text-blue-400">
            {fmt(en.start_time)} to {fmt(en.end_time)}
            {en.company_name ? <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">{en.company_name}</span> : null}
          </p>
          <p className="ml-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{en.description}</p>
        </div>
      )) : (
        <p className="text-gray-400 italic">No work log entries for this date.</p>
      )}
    </div>
  );
}

function EditModal({ report, onClose, onSaved }: { report: any; onClose: () => void; onSaved: () => void }) {
  const [loginTime, setLoginTime] = useState(report.login_time || '');
  const [logoutTime, setLogoutTime] = useState(report.logout_time || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async () => {
    setSaving(true);
    try {
      await eodAPI.edit({ report_date: report.report_date, login_time: loginTime, logout_time: logoutTime });
      setMsg('Saved!');
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } catch { setMsg('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Edit Login / Logout Time</h3>
          <button onClick={onClose}><FiX size={18} /></button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Work entries come from your Work Logs and cannot be edited here.</p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Login Time</label>
            <input type="time" value={loginTime} onChange={e => setLoginTime(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Logout Time</label>
            <input type="time" value={logoutTime} onChange={e => setLogoutTime(e.target.value)} className="input" />
          </div>
        </div>
        {msg && <p className="text-sm mt-3 text-green-600">{msg}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={save} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <FiCheck size={14} /> {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── User View ──────────────────────────────────────────────────
function UserEOD() {
  const [selectedDate, setSelectedDate] = useState(todayIST);
  const [report, setReport] = useState<any>(null);
  const [allReports, setAllReports] = useState<any[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [editReport, setEditReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAll();
    loadByDate(todayIST());
  }, []);

  const loadAll = async () => {
    try { const r = await eodAPI.getMy(); setAllReports(r.data); } catch {}
  };

  const loadByDate = async (d: string) => {
    setLoading(true);
    try { const r = await eodAPI.getByDate(d); console.log('EOD DEBUG:', r.data); setReport(r.data); } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadByDate(selectedDate); }, [selectedDate]);

  return (
    <div className="space-y-6">
      {/* Date picker + current view */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FiCalendar className="text-blue-500" />
            <input type="date" value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="input w-44" />
          </div>
          {report?.has_worklogs && (
            <button onClick={() => setEditReport(report)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
              <FiEdit2 size={14} /> Edit Login/Logout
            </button>
          )}
        </div>
        {loading ? (
          <p className="text-gray-400 text-sm py-4 text-center">Loading...</p>
        ) : report?.has_worklogs ? (
          <EODView report={report} />
        ) : (
          <p className="text-gray-400 text-sm py-4 text-center">No work logs found for this date. Add entries in Work Logs first.</p>
        )}
      </div>

      {/* History list */}
      {allReports.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">History</h2>
          {allReports.map(r => (
            <div key={r.report_date} className="card mb-2">
              <div className="flex justify-between items-center cursor-pointer"
                onClick={() => setExpandedDate(expandedDate === r.report_date ? null : r.report_date)}>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{r.report_date}</span>
                  {(r.login_time || r.logout_time) && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <FiClock size={11} /> {fmt(r.login_time)} – {fmt(r.logout_time)}
                    </span>
                  )}
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {r.entries?.length || 0} entries
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={e => { e.stopPropagation(); setEditReport(r); }}
                    className="text-gray-400 hover:text-blue-500 transition">
                    <FiEdit2 size={14} />
                  </button>
                  {expandedDate === r.report_date ? <FiChevronUp size={15} /> : <FiChevronDown size={15} />}
                </div>
              </div>
              {expandedDate === r.report_date && (
                <div className="mt-3 border-t pt-3 dark:border-gray-700">
                  <EODView report={r} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editReport && (
        <EditModal report={editReport} onClose={() => setEditReport(null)}
          onSaved={() => { loadAll(); loadByDate(selectedDate); }} />
      )}
    </div>
  );
}

// ── Admin View ─────────────────────────────────────────────────
function AdminEOD() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(todayIST());
  const [endDate, setEndDate] = useState(todayIST());
  const [employeeId, setEmployeeId] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const r = await authAPI.getUsers();
        let list = r.data;
        if (user && user.role !== 'admin') {
          // Filter to team leader's subordinates / department members / team members or themselves
          list = list.filter((u: any) => 
            u.id === user.id ||
            u.manager_id === user.id ||
            (u.team_id && u.team_id === user.team_id && u.role !== 'admin') ||
            (u.department_id && u.department_id === user.department_id && u.role !== 'admin')
          );
        }
        setEmployees(list);
      } catch (e) {
        console.error('Failed to load employees for EOD dropdown', e);
      }
    };
    loadEmployees();
    load();
  }, [user]);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (employeeId) params.employee_id = employeeId;
      
      const r = await eodAPI.getAdmin(params);
      setReports(r.data);
    } catch (err) {
      console.error('Failed to load EOD reports', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Filter Panel - High-end premium styling with modern layout */}
      <div className="card p-6 border-none bg-gradient-to-br from-white/95 to-white/60 dark:from-gray-800/95 dark:to-gray-800/60 backdrop-blur-md shadow-xl rounded-2xl relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        <div className="flex flex-col lg:flex-row lg:items-end gap-5">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FiCalendar className="text-indigo-500" /> Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="input w-full border-gray-200/80 dark:border-gray-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-xl"
            />
          </div>

          <div className="flex-1 min-w-0">
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FiCalendar className="text-indigo-500" /> End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="input w-full border-gray-200/80 dark:border-gray-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-xl"
            />
          </div>

          <div className="flex-1 min-w-0">
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FiUser className="text-blue-500" /> Select Employee
            </label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="input w-full border-gray-200/80 dark:border-gray-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-xl"
            >
              <option value="">All Employees</option>
              {employees.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role?.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
          </div>

          <div className="w-full lg:w-auto">
            <button
              onClick={load}
              disabled={loading}
              className="btn-primary w-full lg:w-auto px-8 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-md shadow-blue-500/20 hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white cursor-pointer hover:brightness-105 active:scale-95 disabled:opacity-50"
            >
              <FiFilter className="animate-pulse" /> {loading ? 'Loading...' : 'Filter Reports'}
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-gray-450 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700/50 pt-3">
          <span>Logged-in role: <strong className="text-indigo-600 dark:text-indigo-400 capitalize">{user?.role?.replace(/_/g, ' ')}</strong></span>
          <span className="font-semibold">{reports.length} report(s) found</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm font-medium">Fetching EOD logs...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="card text-center py-16 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border-dashed border-2 border-gray-250 dark:border-gray-700/50 rounded-2xl">
          <p className="text-gray-400 text-base mb-2">No EOD reports found for the selected criteria.</p>
          <p className="text-xs text-gray-500">Try adjusting your date range or selecting a different employee.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r, index) => {
            const cardKey = `${r.user_id || r.user_name}-${r.report_date}-${index}`;
            const isCardExpanded = expanded === cardKey;
            return (
              <div
                key={cardKey}
                className="card border border-gray-100 dark:border-gray-700/45 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-md transition-all duration-200 rounded-xl overflow-hidden"
              >
                <div
                  className="flex justify-between items-center cursor-pointer p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm select-none"
                  onClick={() => setExpanded(isCardExpanded ? null : cardKey)}
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-100">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center text-xs font-black capitalize">
                        {r.user_name?.slice(0, 2)}
                      </div>
                      {r.user_name}
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded capitalize font-medium">
                      {r.user_role?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                      <FiCalendar size={11} /> {r.report_date}
                    </span>
                    {(r.login_time || r.logout_time) && (
                      <span className="text-xs text-gray-500 dark:text-gray-455 flex items-center gap-1 font-medium">
                        <FiClock size={11} className="text-emerald-500" /> {fmt(r.login_time)} – {fmt(r.logout_time)}
                      </span>
                    )}
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-medium">
                      {r.entries?.length || 0} entries
                    </span>
                  </div>
                  <div className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    {isCardExpanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                  </div>
                </div>
                {isCardExpanded && (
                  <div className="p-4 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/30">
                    <EODView report={r} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function EODPage() {
  const { user } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(user?.role || '');

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white mb-8">EOD Report</h1>
      {isAdmin ? <AdminEOD /> : <UserEOD />}
    </div>
  );
}
