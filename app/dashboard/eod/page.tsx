'use client';

import { useEffect, useState } from 'react';
import { eodAPI } from '../../utils/api';
import { useAuth } from '../../utils/AuthContext';
import { FiCalendar, FiUser, FiClock, FiEdit2, FiChevronDown, FiChevronUp, FiX, FiCheck } from 'react-icons/fi';

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
  const [date, setDate] = useState(todayIST);
  const [reports, setReports] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(todayIST()); }, []);

  const load = async (d?: string) => {
    setLoading(true);
    try { const r = await eodAPI.getAdmin(d ?? date); setReports(r.data); } catch {}
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input w-44" />
        <button onClick={() => load(date)} className="btn-primary px-5">View</button>
        <span className="text-sm text-gray-500">{reports.length} employee(s) with logs</span>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Loading...</p>
      ) : reports.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No work logs found for this date.</p>
      ) : (
        reports.map(r => (
          <div key={r.user_name} className="card">
            <div className="flex justify-between items-center cursor-pointer"
              onClick={() => setExpanded(expanded === r.user_name ? null : r.user_name)}>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  <FiUser size={14} className="text-blue-500" /> {r.user_name}
                </div>
                <span className="text-xs text-gray-400 capitalize">{r.user_role?.replace(/_/g, ' ')}</span>
                {(r.login_time || r.logout_time) && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <FiClock size={11} /> {fmt(r.login_time)} – {fmt(r.logout_time)}
                  </span>
                )}
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {r.entries?.length || 0} entries
                </span>
              </div>
              {expanded === r.user_name ? <FiChevronUp size={15} /> : <FiChevronDown size={15} />}
            </div>
            {expanded === r.user_name && (
              <div className="mt-3 border-t pt-3 dark:border-gray-700">
                <EODView report={r} />
              </div>
            )}
          </div>
        ))
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
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">EOD Report</h1>
      {isAdmin ? <AdminEOD /> : <UserEOD />}
    </div>
  );
}
