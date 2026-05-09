'use client';

import { useEffect, useState, useRef } from 'react';
import { activityAPI, authAPI } from '../../utils/api';
import { useAuth } from '../../utils/AuthContext';
import { FiRefreshCw, FiActivity, FiUsers, FiClock, FiZap } from 'react-icons/fi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  active:  { label: 'Active',   dot: 'bg-green-400 animate-pulse',  badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  online:  { label: 'Online',   dot: 'bg-blue-400',                  badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  idle:    { label: 'Idle',     dot: 'bg-yellow-400 animate-pulse',  badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  away:    { label: 'Away',     dot: 'bg-orange-400',                badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  offline: { label: 'Offline',  dot: 'bg-gray-400',                  badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
};

function fmtSeconds(sec: number) {
  if (!sec) return '0m';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 90 ? 'bg-green-500' :
    score >= 70 ? 'bg-blue-500'  :
    score >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`}
             style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="text-xs font-semibold w-10 text-right">{score?.toFixed(0) ?? 0}%</span>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: any) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [filter, setFilter]       = useState<'all' | 'active' | 'idle' | 'offline'>('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<any>(null);

  const load = async () => {
    try {
      const res = await activityAPI.getLive();
      setEmployees(res.data);
      setLastRefresh(new Date());
    } catch {}
  };

  useEffect(() => {
    load();
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) {
      intervalRef.current = setInterval(load, 30000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh]);

  const filtered = filter === 'all'
    ? employees
    : employees.filter(e => e.status === filter);

  const activeCount  = employees.filter(e => e.status === 'active').length;
  const idleCount    = employees.filter(e => e.status === 'idle' || e.status === 'away').length;
  const offlineCount = employees.filter(e => e.status === 'offline').length;
  const avgScore     = employees.length
    ? employees.reduce((s, e) => s + (e.productivity_score || 0), 0) / employees.length
    : 0;

  return (
    <div className="pb-20 pt-4 px-2 md:px-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white dark:bg-surface-dark p-4 md:p-6 rounded-[2rem] md:rounded-3xl border border-gray-100 dark:border-white/5 shadow-xl shadow-black/5 mb-8">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-500/10 dark:bg-gold-500/10 border border-primary-500/20 dark:border-gold-500/20 rounded-xl md:rounded-2xl flex items-center justify-center text-primary-500 dark:text-gold-500 shadow-inner">
             <FiActivity size={20} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2 uppercase">
              Live Monitor
            </h1>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5 opacity-70">
              Real-time Status • {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex flex-row items-center justify-between lg:justify-end gap-3">
          <label className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-gray-600 dark:text-gray-400 cursor-pointer uppercase tracking-tighter">
            <input type="checkbox" checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded" />
            Auto-refresh
          </label>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-white/10 transition-all active:scale-95 shadow-sm">
            <FiRefreshCw size={14} className={autoRefresh ? 'animate-spin-slow' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <StatCard icon={<FiZap />}      label="Active"   value={activeCount}          color="bg-green-500"  sub="Working" />
        <StatCard icon={<FiClock />}    label="Idle"     value={idleCount}            color="bg-yellow-500" sub="No activity" />
        <StatCard icon={<FiUsers />}    label="Offline"      value={offlineCount}         color="bg-gray-500"   sub="Not logged" />
        <StatCard icon={<FiActivity />} label="Score"    value={`${avgScore.toFixed(0)}%`} color="bg-blue-500" sub="Productivity" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 md:gap-2 p-1 md:p-1.5 bg-gray-100 dark:bg-white/5 rounded-2xl w-full md:w-fit mb-8 border border-gray-200/50 dark:border-white/5 shadow-inner overflow-x-auto no-scrollbar">
        {(['all', 'active', 'idle', 'offline'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 md:flex-none px-4 md:px-5 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
              filter === f
                ? 'bg-white dark:bg-gold-500 text-primary-600 dark:text-darker shadow-xl shadow-black/5'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}>
            {f === 'all' ? `All (${employees.length})` :
             f === 'active' ? `Active (${activeCount})` :
             f === 'idle'   ? `Idle (${idleCount})` :
             `Offline (${offlineCount})`}
          </button>
        ))}
      </div>

      {/* Employee grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.length === 0 && (
          <div className="col-span-3 bg-white dark:bg-surface-dark border border-dashed border-gray-200 dark:border-white/10 rounded-3xl py-24 text-center">
             <FiActivity className="mx-auto text-gray-200 dark:text-gray-700 mb-4" size={48} />
             <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">No employees found</p>
          </div>
        )}
        {filtered.map((emp: any) => {
          const cfg = STATUS_CONFIG[emp.status] || STATUS_CONFIG.offline;
          const totalSec = (emp.today_active_seconds || 0) + (emp.today_idle_seconds || 0);
          return (
            <div key={emp.id} className="bg-white dark:bg-surface-dark rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02] hover:shadow-2xl hover:shadow-primary-500/5 transition-all duration-300 group">
              {/* Top row */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/10 dark:to-white/5 
                                    flex items-center justify-center text-gray-700 dark:text-white font-black text-lg border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
                      {emp.profile_image ? (
                        <img 
                          src={`${API_URL}/auth/profile/image/${emp.profile_image}`} 
                          alt={emp.name} 
                          className="w-full h-full object-cover" 
                          crossOrigin="anonymous" 
                        />
                      ) : (
                        emp.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4
                                      border-white dark:border-surface-dark shadow-sm ${cfg.dot}`} />
                  </div>
                  <div>
                    <p className="font-black text-gray-900 dark:text-white text-sm tracking-tight leading-none mb-1">{emp.name}</p>
                    <p className="text-[10px] font-bold text-primary-500 dark:text-gold-500 uppercase tracking-widest opacity-80">{emp.role?.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm ${cfg.badge.includes('green') ? 'border-green-200/50' : cfg.badge.includes('yellow') ? 'border-yellow-200/50' : 'border-gray-200/50'} ${cfg.badge}`}>
                  {cfg.label}
                </span>
              </div>

              {/* Team / dept */}
              {(emp.team_name || emp.department_name) && (
                <div className="mb-4 flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-white/3 rounded-xl border border-gray-100 dark:border-white/5 w-fit">
                   <FiUsers size={12} className="text-gray-400" />
                   <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-tighter">
                    {emp.team_name}{emp.team_name && emp.department_name ? ' • ' : ''}{emp.department_name}
                   </p>
                </div>
              )}

              {/* Productivity score */}
              <div className="mb-4 p-4 bg-slate-50/50 dark:bg-white/3 rounded-2xl border border-gray-100 dark:border-white/5">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  <span>Productivity Index</span>
                  <span className="text-primary-500">{fmtSeconds(emp.today_active_seconds || 0)} active</span>
                </div>
                <ScoreBar score={emp.productivity_score || 0} />
              </div>

              {/* Active vs Idle bar */}
              {totalSec > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter mb-2">
                    <span className="text-green-600 dark:text-green-400">Activity Ratio</span>
                    <span className="text-gray-400">{Math.round((emp.today_active_seconds / totalSec) * 100)}% active</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden flex shadow-inner">
                    <div className="bg-green-500 h-full transition-all duration-700 ease-out"
                         style={{ width: `${(emp.today_active_seconds / totalSec) * 100}%` }} />
                    <div className="bg-yellow-400 h-full transition-all duration-700 ease-out"
                         style={{ width: `${(emp.today_idle_seconds / totalSec) * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Last active */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-white/5">
                 <FiClock size={12} className="text-gray-300" />
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                  {emp.status === 'offline'
                    ? emp.check_in_time ? '✓ Checked in today' : 'Not checked in today'
                    : emp.last_active
                    ? `Active until: ${new Date(emp.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'No session data'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
