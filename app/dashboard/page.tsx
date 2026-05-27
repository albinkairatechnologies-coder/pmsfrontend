'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../utils/AuthContext';
import { dashboardAPI, clientAPI, taskAPI, salaryAPI, announcementAPI, rewardsAPI, attendanceAPI } from '../utils/api';
import { FiUsers, FiCheckCircle, FiAlertCircle, FiGrid, FiEye, FiDollarSign, FiAward, FiTrendingUp, FiClock, FiLogIn, FiLogOut, FiX, FiCalendar, FiUser, FiActivity } from 'react-icons/fi';
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

const STAGES = ['planning','design','development','testing','delivery','completed'];

const getStageStatusForTask = (task: any, stage: string): string => {
  if (!task || !task.pipeline_stages) return 'pending';
  
  const stages = task.pipeline_stages;
  
  if (stage === 'delivery') {
    const cv = stages.find((s: any) => s.stage_name === 'client_verification');
    if (!cv) return 'pending';
    if (cv.status === 'completed') return 'completed';
    if (cv.status === 'in_progress') return 'in_progress';
    return 'pending';
  }
  
  if (stage === 'completed') {
    const cv = stages.find((s: any) => s.stage_name === 'client_verification');
    if (!cv) return 'pending';
    if (cv.status === 'completed') return 'completed';
    return 'pending';
  }
  
  const found = stages.find((s: any) => s.stage_name === stage);
  return found ? found.status : 'pending';
};

const getOverallProgress = (task: any) => {
  if (!task || !task.pipeline_stages) return 0;
  const stages = ['planning', 'design', 'development', 'testing', 'delivery', 'completed'];
  let highestCompletedIndex = -1;
  stages.forEach((stage, idx) => {
    const status = getStageStatusForTask(task, stage);
    if (status === 'completed') {
      highestCompletedIndex = idx;
    }
  });
  
  const percentages = [15, 35, 60, 80, 95, 100];
  if (highestCompletedIndex === -1) {
    const inProgressIndex = stages.findIndex(s => getStageStatusForTask(task, s) === 'in_progress');
    if (inProgressIndex !== -1) {
      return Math.round(percentages[inProgressIndex] / 2);
    }
    return 0;
  }
  return percentages[highestCompletedIndex];
};

function parseIST(iso: string | null) {
  if (!iso) return null;
  if (!iso.includes('+') && !iso.endsWith('Z')) {
    return new Date(iso + '+05:30');
  }
  return new Date(iso);
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats]     = useState<any>(null);
  const [salaryStats, setSalaryStats] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<any>(null);
  const [showImage, setShowImage] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [autoOpenNew, setAutoOpenNew] = useState(true);
  const [newTaskAlert, setNewTaskAlert] = useState<string | null>(null);

  const selectedTaskIdRef = useRef<number | null>(null);
  const autoOpenNewRef = useRef(true);
  const prevMaxTaskIdRef = useRef<number | null>(null);

  useEffect(() => {
    selectedTaskIdRef.current = selectedTaskId;
  }, [selectedTaskId]);

  useEffect(() => {
    autoOpenNewRef.current = autoOpenNew;
  }, [autoOpenNew]);

  const getAssetPath = (path: string | null) => {
    if (!path) return '';
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/pms')) {
      return `/pms${path}`;
    }
    return path;
  };

  const fetchAttendance = async () => {
    try {
      const res = await attendanceAPI.getToday();
      setAttendance(res.data?.attendance || null);
    } catch (err) {}
  };

  const loadDashboardData = async () => {
    if (!user) return;
    try {
      if (user.role === 'admin' || user.role === 'marketing_head' || user.role === 'bdm_head') {
        const [d, s] = await Promise.all([
          dashboardAPI.getAdminDashboard().catch(() => ({ data: null })),
          salaryAPI.getStats().catch(() => ({ data: null }))
        ]);
        if (d?.data) setStats(d.data);
        if (s?.data) setSalaryStats(s.data);
      }
      else if (user.role === 'team_lead' || user.role === 'crm_head' || user.role === 'bdm') {
        const res = await dashboardAPI.getLeadDashboard().catch(() => null);
        if (res?.data) setStats(res.data);
      }
      else if (user.role === 'client') {
        const clientRes = await clientAPI.getAll().catch(() => ({ data: [] }));
        const client = clientRes?.data?.[0];
        if (client) {
          const statRes = await taskAPI.getClientStats(client.id).catch(() => ({ data: null }));
          setStats({ client, taskStats: statRes?.data });

          const clientTasks = client.tasks || [];
          if (clientTasks.length > 0) {
            const sortedTasks = [...clientTasks].sort((a: any, b: any) => b.id - a.id);
            const latestTaskId = sortedTasks[0].id;
            
            const currentSelected = selectedTaskIdRef.current;
            const currentPrevMax = prevMaxTaskIdRef.current;

            // 1. Initial selection
            if (currentSelected === null) {
              setSelectedTaskId(latestTaskId);
            }
            // 2. Detect brand new task
            else if (currentPrevMax !== null && latestTaskId > currentPrevMax && autoOpenNewRef.current) {
              setSelectedTaskId(latestTaskId);
              setNewTaskAlert(sortedTasks[0].title);
              setTimeout(() => setNewTaskAlert(null), 5000);
            }

            prevMaxTaskIdRef.current = latestTaskId;
          }
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
  };

  useEffect(() => {
    if (!user) return;
    loadDashboardData().then(() => setLoading(false));

    const timer = setInterval(() => {
      loadDashboardData();
    }, 5000);

    return () => clearInterval(timer);
  }, [user]);

  const handleCheckInOut = async () => {
    try {
      if (attendance?.check_in_time && !attendance?.check_out_time) {
        if (!confirm('Confirm check-out?')) return;
        await attendanceAPI.checkOut();
        setShowImage('/chechout.jpg');
      } else {
        await attendanceAPI.checkIn();
        setShowImage('/morningatt.gif');
      }
      fetchAttendance();
      setTimeout(() => setShowImage(null), 3500);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to process check-in/out action.');
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
                    {(() => {
                      const d = parseIST(attendance.check_in_time);
                      return d ? d.toLocaleTimeString('en-US', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      }) : '--:--';
                    })()}
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

  /* ── Admin / Marketing Head / BDM Head ── */
  if (user?.role === 'admin' || user?.role === 'marketing_head' || user?.role === 'bdm_head') return (
    <div className="p-6 space-y-6">
      {showImage && (
        <div 
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[92vw] sm:w-[420px] bg-white/90 dark:bg-dark-card/95 backdrop-blur-lg border border-gray-200/50 dark:border-white/10 shadow-2xl rounded-2xl p-4 flex items-center gap-4 animate-slide-up transition-all duration-300"
          style={{
            boxShadow: showImage.includes('morningatt') 
              ? '0 20px 40px -15px rgba(16,185,129,0.3), 0 0 0 1px rgba(16,185,129,0.1)' 
              : '0 20px 40px -15px rgba(239,68,68,0.3), 0 0 0 1px rgba(239,68,68,0.1)'
          }}
        >
          {/* Left Column: Image Thumbnail */}
          <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-darker shadow-inner">
            <img 
              src={getAssetPath(showImage)} 
              alt="Status" 
              className="w-full h-full object-cover" 
            />
          </div>

          {/* Middle Column: Text Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {showImage.includes('morningatt') ? (
                <>
                  <FiCheckCircle className="text-emerald-500 flex-shrink-0" size={16} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">
                    Checked In
                  </span>
                </>
              ) : (
                <>
                  <FiLogOut className="text-red-500 flex-shrink-0" size={16} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-500">
                    Checked Out
                  </span>
                </>
              )}
            </div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {showImage.includes('morningatt') ? 'Good Morning! ☀️' : 'Good Work Today! 🌙'}
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
              {showImage.includes('morningatt') 
                ? 'Your check-in has been logged. Have an amazing shift!' 
                : 'Your check-out has been registered. Get some rest!'}
            </p>
          </div>

          {/* Right Column: Close Button */}
          <button 
            onClick={() => setShowImage(null)} 
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            aria-label="Dismiss notification"
          >
            <FiX size={18} />
          </button>
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black dark:text-white uppercase tracking-tight">Admin Dashboard</h1>
          <p className="text-gray-500 text-xs mt-1">Hello, {user.name}</p>
        </div>
        <div className="w-full md:w-auto max-w-md">
          <AttendanceWidget />
        </div>
      </div>

      {/* Big stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <LuxuryStatCard {...STAT_CONFIGS[0]} value={stats?.total_teams          || 0} />
        <LuxuryStatCard {...STAT_CONFIGS[1]} value={stats?.total_employees      || 0} />
        <LuxuryStatCard {...STAT_CONFIGS[2]} value={stats?.task_stats?.completed || 0} />
        <LuxuryStatCard icon={FiDollarSign} label="Total Salary" value={`₹${salaryStats?.total_spent?.toLocaleString() || 0}`} color="#F59E0B" glow="rgba(245,158,11,.3)" />
        <LuxuryStatCard icon={FiAward} label="Total Gold" value={rewards?.total_coins || 0} color="#FBBF24" glow="rgba(251,191,36,.3)" />
        <LuxuryStatCard {...STAT_CONFIGS[3]} value={stats?.task_stats?.overdue   || 0} />
      </div>

      {/* Mini stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
        
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
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

        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {stats?.employee_productivity?.map((emp: any, i: number) => (
            <div key={i} className="p-4 bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">{emp.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{emp.role?.replace(/_/g, ' ')}</p>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  emp.overdue > 0 ? 'bg-red-500/10 text-red-500' : 'bg-gray-500/10 text-gray-400'
                }`}>
                  {emp.overdue} Overdue
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-white/5 text-[11px]">
                <div>
                  <span className="text-gray-400">Team:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{emp.team_name || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Department:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{emp.dept_name || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Assigned:</span> <span className="font-bold text-primary-500">{emp.assigned_tasks}</span>
                </div>
                <div>
                  <span className="text-gray-400">Completed:</span> <span className="font-bold text-emerald-500">{emp.completed_tasks}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlowCard>
    </div>
  );

  /* ── Team Lead / CRM / BDM ── */
  if (user?.role === 'team_lead' || user?.role === 'crm_head' || user?.role === 'bdm') return (
    <div className="p-6 space-y-6">
      {showImage && (
        <div 
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[92vw] sm:w-[420px] bg-white/90 dark:bg-dark-card/95 backdrop-blur-lg border border-gray-200/50 dark:border-white/10 shadow-2xl rounded-2xl p-4 flex items-center gap-4 animate-slide-up transition-all duration-300"
          style={{
            boxShadow: showImage.includes('morningatt') 
              ? '0 20px 40px -15px rgba(16,185,129,0.3), 0 0 0 1px rgba(16,185,129,0.1)' 
              : '0 20px 40px -15px rgba(239,68,68,0.3), 0 0 0 1px rgba(239,68,68,0.1)'
          }}
        >
          {/* Left Column: Image Thumbnail */}
          <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-darker shadow-inner">
            <img 
              src={getAssetPath(showImage)} 
              alt="Status" 
              className="w-full h-full object-cover" 
            />
          </div>

          {/* Middle Column: Text Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {showImage.includes('morningatt') ? (
                <>
                  <FiCheckCircle className="text-emerald-500 flex-shrink-0" size={16} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">
                    Checked In
                  </span>
                </>
              ) : (
                <>
                  <FiLogOut className="text-red-500 flex-shrink-0" size={16} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-500">
                    Checked Out
                  </span>
                </>
              )}
            </div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {showImage.includes('morningatt') ? 'Good Morning! ☀️' : 'Good Work Today! 🌙'}
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
              {showImage.includes('morningatt') 
                ? 'Your check-in has been logged. Have an amazing shift!' 
                : 'Your check-out has been registered. Get some rest!'}
            </p>
          </div>

          {/* Right Column: Close Button */}
          <button 
            onClick={() => setShowImage(null)} 
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            aria-label="Dismiss notification"
          >
            <FiX size={18} />
          </button>
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-shimmer">Team Dashboard</h1>
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

      {/* New Same Department Employee Attendance Card */}
      <GlowCard className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <FiActivity className="text-[#6366F1]" size={16} />
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Department Attendance
            </h2>
          </div>
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase rounded-full tracking-widest">
            Today's Status
          </span>
        </div>

        {!stats?.dept_attendance?.length ? (
          <p className="text-gray-400 text-sm text-center py-6">No department members found or registered.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stats.dept_attendance.map((emp: any) => {
              const checkedIn = !!emp.check_in_time;
              const checkedOut = !!emp.check_out_time;
              
              // Formatting helper for IST times
              const formatTime = (isoStr: string) => {
                if (!isoStr) return '';
                const d = new Date(isoStr);
                return d.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                });
              };

              return (
                <div key={emp.user_id} className="p-4 bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl flex flex-col justify-between hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{emp.name}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{emp.role?.replace(/_/g, ' ')}</p>
                      </div>
                      
                      {/* Pulsing Status Dot */}
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${
                        checkedIn && !checkedOut
                          ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                          : checkedOut
                          ? 'bg-blue-500'
                          : 'bg-gray-300 dark:bg-gray-700'
                      }`} title={
                        checkedIn && !checkedOut ? 'On Duty (Active)' : checkedOut ? 'Shift Completed' : 'Not Clocked In'
                      } />
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 text-[11px] space-y-1.5 text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={`font-semibold uppercase text-[10px] px-1.5 py-0.5 rounded ${
                        emp.status === 'present'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : emp.status === 'late'
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : emp.status === 'half_day'
                          ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                          : 'bg-slate-500/10 text-slate-400'
                      }`}>
                        {emp.status ? emp.status.replace(/_/g, ' ') : 'Absent'}
                      </span>
                    </div>

                    {checkedIn && (
                      <div className="flex justify-between">
                        <span>Check-In:</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{formatTime(emp.check_in_time)}</span>
                      </div>
                    )}

                    {checkedOut && (
                      <div className="flex justify-between">
                        <span>Check-Out:</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{formatTime(emp.check_out_time)}</span>
                      </div>
                    )}
                    
                    {emp.net_hours > 0 && (
                      <div className="flex justify-between">
                        <span>Hours worked:</span>
                        <span className="font-bold text-[#6366F1]">{emp.net_hours} hrs</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlowCard>
    </div>
  );

  /* ── Client ── */
  if (user?.role === 'client') {
    const clientTasks = stats?.client?.tasks || [];
    const selectedTask = clientTasks.find((t: any) => t.id === selectedTaskId) || null;
    const progress = selectedTask ? getOverallProgress(selectedTask) : 0;

    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-shimmer uppercase tracking-tight">Project Dashboard</h1>
            <p className="text-gray-500 text-xs mt-1">Logged in as {stats?.client?.contact_person || user.name}</p>
          </div>
          
          {/* New Task Notification for Internal Client */}
          {newTaskAlert && (
            <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>New Task Added: {newTaskAlert}</span>
            </div>
          )}
        </div>

        {/* Overall Project Progress Status Bar */}
        {selectedTask && (
          <div className="w-full bg-white/80 dark:bg-[#11131E]/60 border border-indigo-500/20 dark:border-indigo-500/10 p-5 rounded-3xl shadow-[0_8px_30px_rgba(99,102,241,0.06)] relative overflow-hidden backdrop-blur-md">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/2 to-pink-500/5 opacity-70"></div>
            <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500"></div>
            <div className="relative z-10 pl-2">
              <div className="flex justify-between items-center mb-2.5">
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                    </span>
                    <span>Overall Project Progress</span>
                  </p>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white mt-1 flex items-center gap-1.5 uppercase tracking-tight">
                    <span>🚀</span> Status: {progress === 100 ? 'Completed 🎉' : selectedTask.status.replace(/_/g, ' ')}
                  </h3>
                </div>
                <span className="text-[10px] font-black text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-md shadow-indigo-500/30 px-3 py-1.5 rounded-full">
                  {progress}% Complete
                </span>
              </div>
              
              {/* Progress Bar Track */}
              <div className="w-full h-3.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden relative border border-gray-200/40 dark:border-white/5 p-[2px]">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_12px_rgba(168,85,247,0.5)] transition-all duration-1000 ease-out relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-shimmer"></div>
                </div>
              </div>
            </div>
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes progress-shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
              .animate-shimmer {
                background-size: 200% 100%;
                animation: progress-shimmer 3s infinite linear;
              }
            `}} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">
            <GlowCard className="p-6" goldBorder>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{stats?.client?.company_name}</h2>
                
                {/* Auto Open switch inside internal dashboard */}
                <button 
                  type="button"
                  onClick={() => setAutoOpenNew(!autoOpenNew)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all duration-300 ${
                    autoOpenNew 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)] hover:bg-emerald-500/20' 
                      : 'bg-slate-100 dark:bg-white/5 text-gray-400 border-transparent hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                  title="When a new task is created, automatically switch focus to it"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${autoOpenNew ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`}></span>
                  <span>Auto-Open New Tasks</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1 capitalize">
                    {selectedTask ? selectedTask.status.replace(/_/g, ' ') : stats?.client?.status?.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Deadline</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                    {selectedTask?.due_date ? new Date(selectedTask.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : stats?.client?.deadline || '—'}
                  </p>
                </div>
              </div>

              {/* Project Execution Pipeline Stepper */}
              <div className="mb-6 bg-gray-50/50 dark:bg-white/[0.01] p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                <CardTitle>Project Execution Pipeline</CardTitle>
                
                {/* Task selector badges */}
                {clientTasks.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6 bg-gray-100/50 dark:bg-white/[0.02] p-3 rounded-xl border border-gray-200/50 dark:border-white/5">
                    <span className="text-xs text-gray-400 font-bold self-center mr-1">View Task Status:</span>
                    {clientTasks.map((t: any) => {
                      const isSel = selectedTaskId === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTaskId(isSel ? null : t.id)}
                          className={`inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-md scale-105 font-bold'
                              : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-500/20 shadow-sm opacity-85 hover:opacity-100 hover:scale-105'
                          }`}
                        >
                          📋 {t.title} {isSel && '✓'}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Stepper display */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  {STAGES.map(stage => {
                    let isCurrent = false;
                    let isCompleted = false;
                    let isInProgress = false;

                    if (selectedTask) {
                      const status = getStageStatusForTask(selectedTask, stage);
                      isCompleted = status === 'completed';
                      isInProgress = status === 'in_progress';
                    } else {
                      isCurrent = stats?.client?.status === stage;
                      const currentIndex = STAGES.indexOf(stats?.client?.status || '');
                      const thisIndex = STAGES.indexOf(stage);
                      isCompleted = thisIndex < currentIndex;
                      isInProgress = isCurrent;
                    }

                    return (
                      <div
                        key={stage}
                        className={`p-3.5 rounded-xl border text-center transition-all shadow-sm ${
                          isCompleted
                            ? 'bg-emerald-500 border-emerald-600 text-white shadow-md'
                            : isInProgress
                            ? 'bg-amber-500 border-amber-600 text-white shadow-md animate-pulse font-bold'
                            : 'bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/5 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        <div className="text-[10px] uppercase font-black tracking-wider opacity-90">
                          {stage.replace(/_/g, ' ')}
                        </div>
                        <div className="text-[9px] mt-1 font-bold uppercase opacity-80">
                          {isCompleted ? '✓ Completed' : isInProgress ? '● Active' : '○ Pending'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedTask?.description && (
                <div className="mt-4 border-t border-gray-100 dark:border-white/5 pt-4">
                  <p className="text-[8px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-extrabold mb-1">Task Description</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-slate-50 dark:bg-white/[0.01] border border-gray-100 dark:border-white/5 p-4 rounded-xl">
                    {selectedTask.description}
                  </p>
                </div>
              )}
            </GlowCard>
          </div>

          {/* Sidebar / Metadata Cards Column */}
          <div className="space-y-6">
            {selectedTask && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">Selected Task Details</p>
                
                {/* Estimated Deadline Card */}
                <div className="p-4 bg-white/60 dark:bg-[#11131E]/60 backdrop-blur-md border border-amber-500/30 dark:border-amber-500/20 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-[0_8px_25px_rgba(245,158,11,0.15)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <FiCalendar size={20} />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[8px] uppercase tracking-[0.1em] text-amber-600 dark:text-amber-400 font-extrabold">Estimated Deadline</p>
                    <p className="text-xs font-extrabold text-gray-800 dark:text-gray-100 mt-1">
                      {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Flexible'}
                    </p>
                  </div>
                </div>

                {/* Project Manager Card */}
                <div className="p-4 bg-white/60 dark:bg-[#11131E]/60 backdrop-blur-md border border-blue-500/30 dark:border-blue-500/20 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-[0_8px_25px_rgba(59,130,246,0.15)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <FiUser size={20} />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[8px] uppercase tracking-[0.1em] text-blue-600 dark:text-blue-400 font-extrabold">Project Manager</p>
                    <p className="text-xs font-extrabold text-gray-800 dark:text-gray-100 mt-1">
                      {selectedTask.assigned_by_name || 'System PM'}
                    </p>
                  </div>
                </div>

                {/* Assigned Lead Card */}
                <div className="p-4 bg-white/60 dark:bg-[#11131E]/60 backdrop-blur-md border border-purple-500/30 dark:border-purple-500/20 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-[0_8px_25px_rgba(168,85,247,0.15)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <FiClock size={20} />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[8px] uppercase tracking-[0.1em] text-purple-600 dark:text-purple-400 font-extrabold">Assigned Lead</p>
                    <p className="text-xs font-extrabold text-gray-800 dark:text-gray-100 mt-1">
                      {selectedTask.assigned_name || 'Assigned Lead'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <GlowCard className="p-6">
              <CardTitle>Progress by Department</CardTitle>
              {stats?.taskStats?.by_department?.map((dept: any) => (
                <div key={dept.department} className="mb-4">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{dept.department}</span>
                    <span className="text-xs text-gray-500">{dept.completed}/{dept.total}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-white/8 overflow-hidden relative">
                    <div className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-500 to-purple-500"
                      style={{ width: `${dept.total > 0 ? (dept.completed / dept.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </GlowCard>
          </div>
        </div>
      </div>
    );
  }

  /* ── Employee ── */
  return (
    <div className="p-6 space-y-6">
      {showImage && (
        <div 
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[92vw] sm:w-[420px] bg-white/90 dark:bg-dark-card/95 backdrop-blur-lg border border-gray-200/50 dark:border-white/10 shadow-2xl rounded-2xl p-4 flex items-center gap-4 animate-slide-up transition-all duration-300"
          style={{
            boxShadow: showImage.includes('morningatt') 
              ? '0 20px 40px -15px rgba(16,185,129,0.3), 0 0 0 1px rgba(16,185,129,0.1)' 
              : '0 20px 40px -15px rgba(239,68,68,0.3), 0 0 0 1px rgba(239,68,68,0.1)'
          }}
        >
          {/* Left Column: Image Thumbnail */}
          <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-darker shadow-inner">
            <img 
              src={getAssetPath(showImage)} 
              alt="Status" 
              className="w-full h-full object-cover" 
            />
          </div>

          {/* Middle Column: Text Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {showImage.includes('morningatt') ? (
                <>
                  <FiCheckCircle className="text-emerald-500 flex-shrink-0" size={16} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">
                    Checked In
                  </span>
                </>
              ) : (
                <>
                  <FiLogOut className="text-red-500 flex-shrink-0" size={16} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-500">
                    Checked Out
                  </span>
                </>
              )}
            </div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {showImage.includes('morningatt') ? 'Good Morning! ☀️' : 'Good Work Today! 🌙'}
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
              {showImage.includes('morningatt') 
                ? 'Your check-in has been logged. Have an amazing shift!' 
                : 'Your check-out has been registered. Get some rest!'}
            </p>
          </div>

          {/* Right Column: Close Button */}
          <button 
            onClick={() => setShowImage(null)} 
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            aria-label="Dismiss notification"
          >
            <FiX size={18} />
          </button>
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-shimmer">My Dashboard</h1>
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
