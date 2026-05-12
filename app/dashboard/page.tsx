'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../utils/AuthContext';
import { dashboardAPI, clientAPI, taskAPI, salaryAPI, announcementAPI, rewardsAPI, attendanceAPI } from '../utils/api';
import { FiUsers, FiCheckCircle, FiAlertCircle, FiGrid, FiEye, FiDollarSign, FiAward, FiTrendingUp, FiClock, FiLogIn, FiLogOut } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import GlowCard from '../components/GlowCard';

const STAT_CONFIGS = [
  { icon: FiGrid,        label: 'Teams',           color: '#6366F1', glow: 'rgba(99,102,241,.3)'  },
  { icon: FiUsers,       label: 'Employees',       color: '#8B5CF6', glow: 'rgba(139,92,246,.3)'  },
  { icon: FiCheckCircle, label: 'Completed Tasks', color: '#10B981', glow: 'rgba(16,185,129,.3)'  },
  { icon: FiAlertCircle, label: 'Overdue Tasks',   color: '#EF4444', glow: 'rgba(239,68,68,.3)'   },
];

/* Shared chart tooltip style — works in both themes */
const tooltipStyle = {
  background: 'var(--tooltip-bg, #1e2433)',
  border: '1px solid rgba(99,102,241,.25)',
  borderRadius: 10,
  fontSize: 12,
};

function LuxuryStatCard({ icon: Icon, label, value, color, glow }: any) {
  return (
    <GlowCard className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em] mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, boxShadow: `0 0 16px ${glow}` }}>
          <Icon size={22} style={{ color }} />
        </div>
      </div>
      <div className="mt-4 h-px w-full opacity-60"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
    </GlowCard>
  );
}

function MiniStatCard({ label, val, color }: any) {
  return (
    <GlowCard className="p-4 text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{val}</p>
    </GlowCard>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
      {children}
    </h2>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats]     = useState<any>(null);
  const [salaryStats, setSalaryStats] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<any>(null);

  const fetchAttendance = async () => {
    try {
      const res = await attendanceAPI.getToday();
      setAttendance(res.data?.attendance || null);
    } catch (err) {}
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        if (user.role === 'admin' || user.role === 'marketing_head') {
          const [d, s] = await Promise.all([
            dashboardAPI.getAdminDashboard().catch(() => ({ data: null })),
            salaryAPI.getStats().catch(() => ({ data: null }))
          ]);
          if (d?.data) setStats(d.data);
          if (s?.data) setSalaryStats(s.data);
        }
        else if (user.role === 'team_lead' || user.role === 'crm_head') {
          const res = await dashboardAPI.getLeadDashboard().catch(() => null);
          if (res?.data) setStats(res.data);
        }
        else if (user.role === 'client') {
          const clientRes = await clientAPI.getAll().catch(() => ({ data: [] }));
          const client = clientRes?.data?.[0];
          if (client) {
             const statRes = await taskAPI.getClientStats(client.id).catch(() => ({ data: null }));
             setStats({ client, taskStats: statRes?.data });
          }
        } else {
          const res = await dashboardAPI.getStaffDashboard().catch(() => null);
          if (res?.data) setStats(res.data);
        }

        // Fetch latest announcements for all roles
        const annRes = await announcementAPI.getAll().catch(() => null);
        if (annRes?.data) setAnnouncements(annRes.data.slice(0, 3));

        // Fetch rewards (Gold Coins) for all users
        const rewRes = await rewardsAPI.getStats().catch(() => null);
        if (rewRes?.data) setRewards(rewRes.data);

        await fetchAttendance();
      } catch (err) { 
        console.error("Dashboard Load Error:", err); 
      }
      setLoading(false);
    })();
  }, [user]);

  const handleCheckInOut = async () => {
    try {
      if (attendance?.check_in_time && !attendance?.check_out_time) {
        await attendanceAPI.checkOut();
      } else {
        await attendanceAPI.checkIn();
      }
      fetchAttendance();
    } catch (err) {
      alert('Failed to process check-in/out action.');
    }
  };

  const AttendanceWidget = () => {
    if (user?.role === 'client') return null;
    const isCheckedIn = !!attendance?.check_in_time && !attendance?.check_out_time;
    const isCheckedOut = !!attendance?.check_out_time;
    
    return (
      <div className="bg-white dark:bg-[#1A1C23] px-6 py-3 rounded-2xl shadow-lg shadow-black/5 border border-gray-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-4 animate-fade-in w-full">
         <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCheckedIn ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-white/5 text-gray-500'}`}>
               <FiClock size={20} className={isCheckedIn ? 'animate-pulse' : ''}/>
            </div>
            <div>
               <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Work Shift Status</p>
               <p className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  {isCheckedIn ? (
                    <>Checked In <span className="text-[10px] px-1.5 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20">LIVE</span></>
                  ) : isCheckedOut ? (
                    <>Shift Ended</>
                  ) : (
                    <>Not Active</>
                  )}
               </p>
            </div>
         </div>
         
         <div className="flex items-center gap-3">
            {isCheckedIn && attendance?.check_in_time && (
               <div className="text-right">
                  <p className="text-[9px] uppercase text-gray-400 tracking-widest font-bold">Started At</p>
                  <p className="text-xs font-black dark:text-gray-200">
                    {new Date(attendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
               </div>
            )}
            <button 
               onClick={handleCheckInOut}
               className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-md transition-all active:scale-95 ${
                 isCheckedIn 
                   ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20' 
                   : 'bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-indigo-500/20'
               }`}
            >
               {isCheckedIn ? <FiLogOut size={14}/> : <FiLogIn size={14}/>}
               {isCheckedIn ? 'Finish Shift' : isCheckedOut ? 'Start Again' : 'Clock In'}
            </button>
         </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-primary-200 rounded-full animate-spin mx-auto mb-3"
          style={{ borderTopColor: '#6366F1' }} />
        <p className="text-gray-400 text-sm">Loading dashboard...</p>
      </div>
    </div>
  );

  /* ── Admin / Marketing Head ── */
  if (user?.role === 'admin' || user?.role === 'marketing_head') return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white uppercase tracking-tight">Admin Dashboard</h1>
          <p className="text-gray-500 text-xs mt-1">Hello, {user.name}</p>
        </div>
        <div className="w-full md:w-auto max-w-md">
          <AttendanceWidget />
        </div>
      </div>

      {/* Big stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <LuxuryStatCard {...STAT_CONFIGS[0]} value={stats?.total_teams          || 0} />
        <LuxuryStatCard {...STAT_CONFIGS[1]} value={stats?.total_employees      || 0} />
        <LuxuryStatCard {...STAT_CONFIGS[2]} value={stats?.task_stats?.completed || 0} />
        <LuxuryStatCard icon={FiDollarSign} label="Total Salary" value={`₹${salaryStats?.total_spent?.toLocaleString() || 0}`} color="#F59E0B" glow="rgba(245,158,11,.3)" />
        <LuxuryStatCard icon={FiAward} label="Total Gold" value={rewards?.total_coins || 0} color="#FBBF24" glow="rgba(251,191,36,.3)" />
        <LuxuryStatCard {...STAT_CONFIGS[3]} value={stats?.task_stats?.overdue   || 0} />
      </div>

      {/* Mini stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks',   val: stats?.task_stats?.total_tasks || 0, color: 'text-primary-600 dark:text-primary-400'  },
          { label: 'In Progress',   val: stats?.task_stats?.in_progress || 0, color: 'text-yellow-600 dark:text-yellow-400'    },
          { label: 'In Review',     val: stats?.task_stats?.in_review   || 0, color: 'text-purple-600 dark:text-purple-400'    },
          { label: 'Total Clients', val: stats?.total_clients           || 0, color: 'text-emerald-600 dark:text-emerald-400'  },
        ].map(s => <MiniStatCard key={s.label} {...s} />)}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlowCard className="p-6">
          <CardTitle>Team Performance</CardTitle>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats?.team_performance || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" />
              <XAxis dataKey="team_name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="total_tasks" fill="#6366F1" name="Total"       radius={[4,4,0,0]} />
              <Bar dataKey="completed"   fill="#10B981" name="Completed"   radius={[4,4,0,0]} />
              <Bar dataKey="in_progress" fill="#F59E0B" name="In Progress" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlowCard>

        <GlowCard className="p-6">
          <CardTitle>Department Performance</CardTitle>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats?.dept_performance || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" />
              <XAxis dataKey="dept_name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="total_tasks" fill="#8B5CF6" name="Total"     radius={[4,4,0,0]} />
              <Bar dataKey="completed"   fill="#10B981" name="Completed" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlowCard>
      </div>

      {/* Announcements */}
      <div className="grid grid-cols-1 gap-6">
         <GlowCard className="p-6">
            <div className="flex justify-between items-center mb-6">
                <CardTitle>Global Broadcasts</CardTitle>
                <span className="px-3 py-1 bg-primary-500/10 text-primary-500 text-[10px] font-black uppercase rounded-full tracking-widest">Live Updates</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {announcements.map((ann) => (
                  <div key={ann.id} className="p-4 bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all">
                     <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-lg bg-primary-500/10 text-primary-500 flex items-center justify-center text-[10px] font-bold">{ann.sender_name?.[0]}</div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{ann.title}</p>
                     </div>
                     <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">{ann.content}</p>
                  </div>
               ))}
               {announcements.length === 0 && <p className="text-sm text-gray-400 col-span-3 text-center py-4">No recent announcements.</p>}
            </div>
         </GlowCard>
      </div>

      {/* Employee table */}
      <GlowCard className="p-6">
        <CardTitle>Employee Productivity</CardTitle>
        <div className="overflow-x-auto">
          <table className="table-base w-full">
            <thead><tr>
              {['Name','Role','Team','Department','Assigned','Completed','Overdue'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {stats?.employee_productivity?.map((emp: any, i: number) => (
                <tr key={i}>
                  <td className="font-medium text-gray-900 dark:text-white">{emp.name}</td>
                  <td className="text-gray-500 dark:text-gray-400">{emp.role}</td>
                  <td>{emp.team_name || '—'}</td>
                  <td>{emp.dept_name || '—'}</td>
                  <td className="text-center">{emp.assigned_tasks}</td>
                  <td className="text-center text-emerald-600 dark:text-emerald-400 font-semibold">{emp.completed_tasks}</td>
                  <td className="text-center">
                    <span className={emp.overdue > 0 ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-gray-400'}>
                      {emp.overdue}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlowCard>
    </div>
  );

  /* ── Team Lead / CRM ── */
  if (user?.role === 'team_lead' || user?.role === 'crm_head') return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-shimmer">Team Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {user.name}</p>
        </div>
        <div className="w-full md:w-auto max-w-md">
          <AttendanceWidget />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total',       val: stats?.task_stats?.total       || 0, color: 'text-primary-600 dark:text-primary-400' },
          { label: 'Pending',     val: stats?.task_stats?.pending     || 0, color: 'text-yellow-600 dark:text-yellow-400'   },
          { label: 'In Progress', val: stats?.task_stats?.in_progress || 0, color: 'text-blue-600 dark:text-blue-400'       },
          { label: 'In Review',   val: stats?.task_stats?.in_review   || 0, color: 'text-purple-600 dark:text-purple-400'   },
          { label: 'Completed',   val: stats?.task_stats?.completed   || 0, color: 'text-emerald-600 dark:text-emerald-400' },
        ].map(s => <MiniStatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlowCard className="p-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <FiEye size={14} className="text-purple-500" /> Pending Approvals
            {stats?.pending_approvals?.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold text-white bg-red-500">
                {stats.pending_approvals.length}
              </span>
            )}
          </h2>
          {!stats?.pending_approvals?.length
            ? <p className="text-gray-400 text-sm">No tasks pending review.</p>
            : <div className="space-y-2">
                {stats.pending_approvals.map((task: any) => (
                  <div key={task.id} className="flex justify-between items-center p-3 rounded-xl bg-purple-50 dark:bg-purple-500/8 border border-purple-100 dark:border-purple-500/20">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
                      <p className="text-xs text-gray-500">by {task.assigned_name}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400">
                      Review
                    </span>
                  </div>
                ))}
              </div>
          }
        </GlowCard>

        <GlowCard className="p-6">
          <CardTitle>Team Performance</CardTitle>
          <div className="space-y-3">
            {stats?.team_performance?.map((m: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-white/3 border border-gray-100 dark:border-white/6">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.role}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-emerald-600 dark:text-emerald-400 font-semibold">{m.completed} done</p>
                  <p className="text-gray-500">{m.assigned} total</p>
                  {m.overdue > 0 && <p className="text-red-500 dark:text-red-400">{m.overdue} overdue</p>}
                </div>
              </div>
            ))}
          </div>
        </GlowCard>
      </div>
    </div>
  );

  /* ── Client ── */
  if (user?.role === 'client') return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-black text-shimmer">Project Dashboard</h1>
      <GlowCard className="p-6" goldBorder>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{stats?.client?.company_name}</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{stats?.client?.status}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Deadline</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{stats?.client?.deadline}</p>
          </div>
        </div>
        <CardTitle>Progress by Department</CardTitle>
        {stats?.taskStats?.by_department?.map((dept: any) => (
          <div key={dept.department} className="mb-4">
            <div className="flex justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-900 dark:text-white">{dept.department}</span>
              <span className="text-xs text-gray-500">{dept.completed}/{dept.total}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-white/8">
              <div className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${dept.total > 0 ? (dept.completed / dept.total) * 100 : 0}%`, background: 'linear-gradient(90deg, #6366F1, #8B5CF6)' }} />
            </div>
          </div>
        ))}
      </GlowCard>
    </div>
  );

  /* ── Employee ── */
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-shimmer">My Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name}</p>
        </div>
        <div className="w-full md:w-auto max-w-md">
          <AttendanceWidget />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Total',       val: stats?.task_stats?.total_tasks       || 0, color: 'text-primary-600 dark:text-primary-400' },
          { label: 'Pending',     val: stats?.task_stats?.pending_tasks     || 0, color: 'text-yellow-600 dark:text-yellow-400'   },
          { label: 'In Progress', val: stats?.task_stats?.in_progress_tasks || 0, color: 'text-blue-600 dark:text-blue-400'       },
          { label: 'In Review',   val: stats?.task_stats?.review_tasks      || 0, color: 'text-purple-600 dark:text-purple-400'   },
          { label: 'Completed',   val: stats?.task_stats?.completed_tasks   || 0, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Gold Coins',  val: rewards?.total_coins                 || 0, color: 'text-amber-500 font-black'             },
        ].map(s => <MiniStatCard key={s.label} {...s} />)}
      </div>

      <GlowCard className="p-6">
        <CardTitle>My Active Tasks</CardTitle>
        {!stats?.upcoming_tasks?.length
          ? <p className="text-gray-400 text-sm">No active tasks.</p>
          : <div className="space-y-3">
              {stats.upcoming_tasks.map((task: any) => (
                <div key={task.id}
                  className="flex justify-between items-start p-4 rounded-xl transition-all bg-gray-50 dark:bg-white/3 border border-gray-100 dark:border-white/6 hover:border-primary-200 dark:hover:border-primary-500/30">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{task.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{task.company_name || task.team_name || '—'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">by {task.assigned_by_name}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      task.priority === 'high'   ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
                      task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' :
                                                   'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    }`}>{task.priority}</span>
                    <p className="text-xs text-gray-400 mt-1">Due: {task.due_date || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
        }
      </GlowCard>
      {/* Announcements */}
      <div className="grid grid-cols-1 gap-6">
         <GlowCard className="p-6">
            <div className="flex justify-between items-center mb-6">
                <CardTitle>Latest News</CardTitle>
                <span className="px-3 py-1 bg-gold-500/10 text-gold-500 text-[10px] font-black uppercase rounded-full tracking-widest">Broadcasts</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {announcements.map((ann) => (
                  <div key={ann.id} className="p-4 bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl">
                     <p className="text-xs font-bold text-gray-900 dark:text-white mb-1">{ann.title}</p>
                     <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">{ann.content}</p>
                  </div>
               ))}
               {announcements.length === 0 && <p className="text-sm text-gray-400 col-span-3 text-center py-4">No latest broadcasts found.</p>}
            </div>
         </GlowCard>
      </div>
    </div>
  );
}
