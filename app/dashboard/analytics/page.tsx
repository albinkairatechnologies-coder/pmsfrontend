'use client';

import { useState, useEffect, useCallback } from 'react';
import { analyticsAPI } from '../../utils/api';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  FiUsers, FiClock, FiCalendar, FiTrendingUp,
  FiMessageSquare, FiStar, FiAlertCircle, FiShield,
} from 'react-icons/fi';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const STATUS_COLORS: Record<string, string> = {
  present:  '#10B981',
  late:     '#F59E0B',
  absent:   '#EF4444',
  on_leave: '#6366F1',
  half_day: '#8B5CF6',
};

function StatCard({ icon: Icon, label, value, sub, accent = 'text-gray-900 dark:text-white' }: any) {
  return (
    <div className="bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-semibold">{label}</p>
        <Icon size={16} className="text-gray-400 dark:text-gray-500" />
      </div>
      <p className={`text-2xl font-bold ${accent}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const today    = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const [start, setStart] = useState(firstDay);
  const [end,   setEnd]   = useState(todayStr);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analyticsAPI.getHR({ start, end });
      setData(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [start, end]);

  useEffect(() => { load(); }, [load]);

  const ao = data?.attendance_overview || {};
  const ls = data?.leave_stats         || {};
  const rs = data?.review_stats        || {};
  const fs = data?.feedback_stats      || {};
  const ps = data?.permission_stats    || {};

  const attendancePie = [
    { name: 'Present',  value: Number(ao.present_days  || 0) },
    { name: 'Late',     value: Number(ao.late_days     || 0) },
    { name: 'Absent',   value: Number(ao.absent_days   || 0) },
    { name: 'On Leave', value: Number(ao.on_leave_days || 0) },
    { name: 'Half Day', value: Number(ao.half_days     || 0) },
  ].filter(d => d.value > 0);

  const leavePie = [
    { name: 'Sick',      value: Number(ls.sick      || 0) },
    { name: 'Casual',    value: Number(ls.casual    || 0) },
    { name: 'Emergency', value: Number(ls.emergency || 0) },
    { name: 'Annual',    value: Number(ls.annual    || 0) },
  ].filter(d => d.value > 0);

  const feedbackBar = [
    { name: 'Work Env',   value: Number(fs.work_environment || 0) },
    { name: 'Team Issue', value: Number(fs.team_issue       || 0) },
    { name: 'Suggestion', value: Number(fs.suggestion       || 0) },
    { name: 'General',    value: Number(fs.general          || 0) },
  ];

  // Theme-aware chart styles
  const gridStroke   = isDark ? '#ffffff10' : '#e5e7eb';
  const tickColor    = isDark ? '#9ca3af'   : '#6b7280';
  const tooltipStyle = {
    background:   isDark ? '#1e1e2e' : '#ffffff',
    border:       isDark ? '1px solid #ffffff15' : '1px solid #e5e7eb',
    borderRadius: 8,
    color:        isDark ? '#f3f4f6' : '#111827',
    fontSize:     12,
  };

  // Card wrapper class
  const card = 'bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/5 rounded-2xl p-5 shadow-sm';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">HR Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Workforce insights across all modules</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" className="input text-sm" value={start} onChange={e => setStart(e.target.value)} />
          <span className="text-gray-400 dark:text-gray-500 text-sm">to</span>
          <input type="date" className="input text-sm" value={end} onChange={e => setEnd(e.target.value)} />
          <button onClick={load} className="btn-primary text-sm">Apply</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24 text-gray-400 dark:text-gray-500">Loading analytics...</div>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={FiUsers}         label="Employees Tracked" value={ao.total_employees}  sub={`${ao.total_records} records`} />
            <StatCard icon={FiClock}         label="Avg Net Hours/Day" value={`${ao.avg_net_hours ?? 0}h`} accent="text-indigo-600 dark:text-indigo-400" />
            <StatCard icon={FiCalendar}      label="Leave Requests"    value={ls.total_requests}   sub={`${ls.approved} approved`} accent="text-emerald-600 dark:text-emerald-400" />
            <StatCard icon={FiTrendingUp}    label="Avg Productivity"  value={`${data?.productivity?.[0]?.avg_productivity ?? 0}%`} accent="text-yellow-600 dark:text-yellow-400" />
            <StatCard icon={FiAlertCircle}   label="Late Days"         value={ao.late_days}        sub={`Avg ${ao.avg_late_minutes ?? 0} min late`} accent="text-orange-600 dark:text-orange-400" />
            <StatCard icon={FiShield}        label="Permissions"       value={ps.total}            sub={`${ps.approved} approved`} />
            <StatCard icon={FiMessageSquare} label="Feedback"          value={fs.total}            sub={`Avg rating ${fs.avg_rating ?? 0}/5`} accent="text-pink-600 dark:text-pink-400" />
            <StatCard icon={FiStar}          label="Reviews"           value={rs.total}            sub={`${rs.completed} completed · Avg ${rs.avg_rating ?? 0}/5`} accent="text-purple-600 dark:text-purple-400" />
          </div>

          {/* ── Row 1: Line + Pie ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`${card} lg:col-span-2`}>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Daily Attendance Trend</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data?.daily_trend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="date" tick={{ fill: tickColor, fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fill: tickColor, fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, color: tickColor }} />
                  <Line type="monotone" dataKey="present"   stroke="#10B981" dot={false} name="Present" />
                  <Line type="monotone" dataKey="late"      stroke="#F59E0B" dot={false} name="Late" />
                  <Line type="monotone" dataKey="absent"    stroke="#EF4444" dot={false} name="Absent" />
                  <Line type="monotone" dataKey="avg_hours" stroke="#6366F1" dot={false} name="Avg Hours" strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className={card}>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Attendance Breakdown</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={attendancePie} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" nameKey="name" paddingAngle={3}>
                    {attendancePie.map((_, i) => (
                      <Cell key={i} fill={Object.values(STATUS_COLORS)[i] || COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, color: tickColor }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Row 2: Bar + Pie ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`${card} lg:col-span-2`}>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Employee Productivity Score</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={(data?.productivity || []).slice(0, 12)} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: tickColor, fontSize: 11 }} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: tickColor, fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}%`, 'Productivity']} />
                  <Bar dataKey="avg_productivity" fill="#6366F1" radius={[0, 4, 4, 0]} name="Productivity %" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={card}>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Leave Types</h2>
              {leavePie.length === 0 ? (
                <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-16">No leave data</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={leavePie} cx="50%" cy="50%" outerRadius={85}
                      dataKey="value" nameKey="name" paddingAngle={3}>
                      {leavePie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12, color: tickColor }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Row 3: Feedback + Late ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={card}>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Feedback by Category</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={feedbackBar}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 11 }} />
                  <YAxis tick={{ fill: tickColor, fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="#EC4899" radius={[4, 4, 0, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={card}>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top Late Arrivals</h2>
              {(data?.top_late || []).length === 0 ? (
                <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-12">No late records 🎉</p>
              ) : (
                <div className="space-y-2">
                  {(data?.top_late || []).map((emp: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-white/5 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{emp.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{emp.team_name || emp.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-orange-500 dark:text-orange-400">{emp.late_count}x late</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">avg {emp.avg_late_min} min</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Employee Attendance Table ── */}
          <div className={card}>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Employee Attendance Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/5">
                    {['Employee', 'Role', 'Team', 'Present', 'Late', 'Absent', 'On Leave', 'Avg Hours', 'Total Hours'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.employee_attendance || []).map((emp: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-gray-800 dark:text-white">{emp.name}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400 capitalize">{emp.role}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">{emp.team_name || '—'}</td>
                      <td className="px-3 py-2.5 font-medium text-emerald-600 dark:text-emerald-400">{emp.present || 0}</td>
                      <td className="px-3 py-2.5 text-yellow-600 dark:text-yellow-400">{emp.late || 0}</td>
                      <td className="px-3 py-2.5 text-red-500 dark:text-red-400">{emp.absent || 0}</td>
                      <td className="px-3 py-2.5 text-indigo-600 dark:text-indigo-400">{emp.on_leave || 0}</td>
                      <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300">{emp.avg_hours ?? 0}h</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800 dark:text-white">{emp.total_hours ?? 0}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Leave by Employee Table ── */}
          {(data?.leave_by_employee || []).length > 0 && (
            <div className={card}>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Leave Usage by Employee</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/5">
                      {['Employee', 'Team', 'Requests', 'Days Taken', 'Approved', 'Rejected'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.leave_by_employee.map((emp: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-gray-800 dark:text-white">{emp.name}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">{emp.team_name || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300">{emp.requests}</td>
                        <td className="px-3 py-2.5 font-semibold text-indigo-600 dark:text-indigo-400">{emp.total_days_taken}</td>
                        <td className="px-3 py-2.5 text-emerald-600 dark:text-emerald-400">{emp.approved}</td>
                        <td className="px-3 py-2.5 text-red-500 dark:text-red-400">{emp.rejected}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
