'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { attendanceAPI } from '../../utils/api';
import { useAuth } from '../../utils/AuthContext';
import {
  FiLogIn, FiLogOut, FiClock, FiCoffee, FiUsers,
  FiAlertCircle, FiCheckCircle, FiCalendar, FiRefreshCw,
} from 'react-icons/fi';

const LEAD_ROLES = ['admin', 'team_lead', 'marketing_head', 'crm_head'];

const STATUS_STYLES: Record<string, string> = {
  present:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  late:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  half_day: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  absent:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  on_leave: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

function pad(n: number) { return String(n).padStart(2, '0'); }

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatTime(iso: string | null) {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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

export default function AttendancePage() {
  const { user } = useAuth();
  const isLead   = LEAD_ROLES.includes(user?.role || '');

  const [attendance, setAttendance] = useState<any>(null);
  const [breaks, setBreaks]         = useState<any[]>([]);
  const [adminData, setAdminData]   = useState<any>(null);
  const [adminDate, setAdminDate]   = useState('');
  const [myHistory, setMyHistory]   = useState<any[]>([]);
  const [tab, setTab]               = useState<'today' | 'history' | 'admin'>('today');
  const [loading, setLoading]       = useState(false);
  const [showImage, setShowImage]   = useState<string | null>(null);
  const [elapsed, setElapsed]       = useState(0);
  const [breakElapsed, setBreakElapsed] = useState(0);
  const timerRef      = useRef<any>(null);
  const breakTimerRef = useRef<any>(null);

  const loadToday = useCallback(async () => {
    try {
      const res = await attendanceAPI.getToday();
      setAttendance(res.data.attendance);
      setBreaks(res.data.breaks || []);
    } catch {}
  }, []);

  const loadAdmin = useCallback(async (date?: string) => {
    try {
      const res = await attendanceAPI.getAdmin(date);
      setAdminData(res.data);
    } catch {}
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const now = new Date();
      const res = await attendanceAPI.getMy(
        String(now.getMonth() + 1),
        String(now.getFullYear())
      );
      setMyHistory(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    loadToday();
    if (isLead) loadAdmin();
  }, []);

  useEffect(() => {
    if (tab === 'history') loadHistory();
    if (tab === 'admin')   loadAdmin(adminDate || undefined);
  }, [tab]);

  // Live work timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (attendance?.check_in_time && !attendance?.check_out_time) {
      const checkIn = new Date(attendance.check_in_time).getTime();
      const tick = () => setElapsed(Math.floor((Date.now() - checkIn) / 1000));
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [attendance]);

  // Live break timer
  useEffect(() => {
    if (breakTimerRef.current) clearInterval(breakTimerRef.current);
    const activeBreak = breaks.find(b => b.status === 'active');
    if (activeBreak) {
      const start = new Date(activeBreak.break_start).getTime();
      const tick  = () => setBreakElapsed(Math.floor((Date.now() - start) / 1000));
      tick();
      breakTimerRef.current = setInterval(tick, 1000);
    } else {
      setBreakElapsed(0);
    }
    return () => { if (breakTimerRef.current) clearInterval(breakTimerRef.current); };
  }, [breaks]);

  const handleCheckIn = async () => {
    setLoading(true);
    try { 
      await attendanceAPI.checkIn(); 
      await loadToday(); 
      setShowImage('/morningatt.gif');
      setTimeout(() => setShowImage(null), 3500);
    }
    catch (e: any) { alert(e.response?.data?.error || 'Check-in failed'); }
    finally { setLoading(false); }
  };

  const handleCheckOut = async () => {
    if (!confirm('Confirm check-out?')) return;
    setLoading(true);
    try { 
      await attendanceAPI.checkOut(); 
      await loadToday(); 
      setShowImage('/chechout.jpg');
      setTimeout(() => setShowImage(null), 3500);
    }
    catch (e: any) { alert(e.response?.data?.error || 'Check-out failed'); }
    finally { setLoading(false); }
  };

  const handleBreakStart = async (type: 'lunch' | 'short' | 'meeting') => {
    setLoading(true);
    try { await attendanceAPI.startBreak(type); await loadToday(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed to start break'); }
    finally { setLoading(false); }
  };

  const handleBreakEnd = async () => {
    setLoading(true);
    try { await attendanceAPI.endBreak(); await loadToday(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed to end break'); }
    finally { setLoading(false); }
  };

  const activeBreak    = breaks.find(b => b.status === 'active');
  const isCheckedIn    = !!attendance?.check_in_time;
  const isCheckedOut   = !!attendance?.check_out_time;
  const totalBreakMins = breaks
    .filter(b => b.status === 'completed')
    .reduce((s, b) => s + (b.duration_minutes || 0), 0);

  // ── Today View ───────────────────────────────────────────────
  const TodayView = () => (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Status + timer */}
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl
              ${!isCheckedIn ? 'bg-gray-100 dark:bg-gray-700' :
                isCheckedOut ? 'bg-green-100 dark:bg-green-900/30' :
                activeBreak  ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                               'bg-blue-100 dark:bg-blue-900/30'}`}>
              {!isCheckedIn ? '🔴' : isCheckedOut ? '✅' : activeBreak ? '☕' : '🟢'}
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white font-mono">
                {isCheckedIn && !isCheckedOut
                  ? formatDuration(elapsed)
                  : isCheckedOut
                  ? `${attendance.net_hours}h worked`
                  : 'Not checked in'}
              </p>
              {attendance?.status && (
                <span className={`mt-1 inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_STYLES[attendance.status]}`}>
                  {attendance.status.replace('_', ' ').toUpperCase()}
                </span>
              )}
              {attendance?.late_by_minutes > 0 && (
                <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">
                  ({attendance.late_by_minutes} min late)
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            {!isCheckedIn && (
              <button onClick={handleCheckIn} disabled={loading}
                className="btn-primary bg-green-500 hover:bg-green-600 px-6 py-3 text-base gap-2">
                <FiLogIn size={18} /> Check In
              </button>
            )}
            {isCheckedIn && !isCheckedOut && !activeBreak && (
              <>
                <button onClick={() => handleBreakStart('short')} disabled={loading}
                  className="btn-secondary gap-2">
                  <FiCoffee size={16} /> Short Break
                </button>
                <button onClick={() => handleBreakStart('lunch')} disabled={loading}
                  className="btn-secondary gap-2">
                  🍽️ Lunch Break
                </button>
                <button onClick={() => handleBreakStart('meeting')} disabled={loading}
                  className="btn-secondary gap-2">
                  📋 Meeting Break
                </button>
                <button onClick={handleCheckOut} disabled={loading}
                  className="btn-primary bg-red-500 hover:bg-red-600 gap-2">
                  <FiLogOut size={16} /> Check Out
                </button>
              </>
            )}
            {activeBreak && (
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Break time</p>
                  <p className="text-xl font-bold font-mono text-yellow-600">{formatDuration(breakElapsed)}</p>
                  <p className="text-xs text-gray-400 capitalize">{activeBreak.break_type} break</p>
                </div>
                <button onClick={handleBreakEnd} disabled={loading}
                  className="btn-primary bg-green-500 hover:bg-green-600 gap-2">
                  <FiCheckCircle size={16} /> End Break
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Time info row */}
        {isCheckedIn && (
          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">Check In</p>
              <p className="font-bold text-gray-800 dark:text-white">{formatTime(attendance.check_in_time)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Check Out</p>
              <p className="font-bold text-gray-800 dark:text-white">{formatTime(attendance.check_out_time)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Break Time</p>
              <p className="font-bold text-yellow-600">{totalBreakMins} min</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Net Hours</p>
              <p className="font-bold text-green-600">{attendance.net_hours || '—'}h</p>
            </div>
          </div>
        )}
      </div>

      {/* Break history */}
      {breaks.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <FiCoffee className="text-yellow-500" /> Today's Breaks
          </h3>
          <div className="space-y-2">
            {breaks.map((b, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${b.status === 'active' ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="font-medium capitalize">{b.break_type} break</span>
                </div>
                <div className="flex items-center gap-6 text-gray-500">
                  <span>{formatTime(b.break_start)}</span>
                  <span>→</span>
                  <span>{b.break_end ? formatTime(b.break_end) : <span className="text-yellow-500 font-medium">Active</span>}</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {b.duration_minutes ? `${b.duration_minutes} min` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── History View ─────────────────────────────────────────────
  const HistoryView = () => (
    <div className="card overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <tr>
            {['Date', 'Check In', 'Check Out', 'Total', 'Break', 'Net Hours', 'Status'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {myHistory.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No records this month</td></tr>
          )}
          {myHistory.map((r, i) => (
            <tr key={i} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/70 dark:hover:bg-gray-800/50">
              <td className="px-4 py-3 font-medium">{r.date}</td>
              <td className="px-4 py-3 font-mono">{formatTime(r.check_in_time)}</td>
              <td className="px-4 py-3 font-mono">{formatTime(r.check_out_time)}</td>
              <td className="px-4 py-3">{r.total_hours ? `${r.total_hours}h` : '—'}</td>
              <td className="px-4 py-3 text-yellow-600">{r.break_minutes ? `${r.break_minutes}m` : '—'}</td>
              <td className="px-4 py-3 font-semibold text-green-600">{r.net_hours ? `${r.net_hours}h` : '—'}</td>
              <td className="px-4 py-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[r.status] || STATUS_STYLES.absent}`}>
                  {r.status?.replace('_', ' ').toUpperCase()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── Admin View ───────────────────────────────────────────────
  const AdminView = () => {
    const stats   = adminData?.stats   || {};
    const records = adminData?.records || [];
    const absent  = adminData?.absent  || [];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <input type="date" value={adminDate}
            onChange={e => setAdminDate(e.target.value)}
            className="input w-48" />
          <button onClick={() => loadAdmin(adminDate || undefined)}
            className="btn-primary gap-2">
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<FiCheckCircle />} label="Present"   value={stats.total_present || 0}       color="bg-green-500" />
          <StatCard icon={<FiAlertCircle />} label="Late"      value={stats.total_late    || 0}       color="bg-yellow-500" />
          <StatCard icon={<FiUsers />}       label="Absent"    value={stats.total_absent  || 0}       color="bg-red-500" />
          <StatCard icon={<FiClock />}       label="Avg Hours" value={`${stats.avg_hours  || 0}h`}   color="bg-blue-500" />
        </div>

        {/* Present table */}
        <div className="card overflow-hidden p-0">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-white">Present Employees ({records.length})</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Employee', 'Team', 'Check In', 'Check Out', 'Net Hours', 'Break', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No records for this date</td></tr>
              )}
              {records.map((r: any, i: number) => (
                <tr key={i} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/70 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 dark:text-white">{r.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{r.role?.replace('_', ' ')}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{r.team_name || '—'}</td>
                  <td className="px-4 py-3 font-mono">{formatTime(r.check_in_time)}</td>
                  <td className="px-4 py-3 font-mono">{formatTime(r.check_out_time)}</td>
                  <td className="px-4 py-3 font-semibold text-green-600">
                    {r.net_hours ? `${r.net_hours}h` : <span className="text-blue-500 text-xs font-normal">Working...</span>}
                  </td>
                  <td className="px-4 py-3 text-yellow-600">{r.break_minutes ? `${r.break_minutes}m` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[r.status] || STATUS_STYLES.absent}`}>
                      {r.status?.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Absent list */}
        {absent.length > 0 && (
          <div className="card overflow-hidden p-0">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <FiAlertCircle className="text-red-500" />
              <h3 className="font-semibold text-gray-800 dark:text-white">Absent Today ({absent.length})</h3>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {absent.map((u: any, i: number) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.department_name || u.team_name || '—'}</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    ABSENT
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {showImage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowImage(null)}>
          <img src={showImage} alt="Attendance Status" className="max-w-[90vw] max-h-[80vh] rounded-2xl shadow-2xl animate-zoom-in object-contain" />
        </div>
      )}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Attendance</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={loadToday} className="btn-secondary gap-2 text-sm">
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit mb-6">
        {[
          { key: 'today',   label: 'Today',      icon: <FiClock size={14} /> },
          { key: 'history', label: 'My History',  icon: <FiCalendar size={14} /> },
          ...(isLead ? [{ key: 'admin', label: 'Admin View', icon: <FiUsers size={14} /> }] : []),
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

      {tab === 'today'   && <TodayView />}
      {tab === 'history' && <HistoryView />}
      {tab === 'admin'   && isLead && <AdminView />}
    </div>
  );
}
