'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  FiChevronLeft, FiChevronRight, FiSearch, 
  FiSun, FiCalendar, FiCheckCircle, 
  FiAlertCircle, FiList, 
  FiUser, FiClock, FiPieChart, FiX, FiFilter, FiTrash2
} from 'react-icons/fi';
import { useAuth } from '../../utils/AuthContext';
import { calendarAPI, orgAPI } from '../../utils/api';

export default function CalendarPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my' | 'tracking'>('my');
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const [searchUser, setSearchUser] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [userEvents, setUserEvents] = useState<any[]>([]);
  const [userCalDate, setUserCalDate] = useState(new Date());
  const [userCalLoading, setUserCalLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'marketing_head') {
      orgAPI.getMembers().then(res => setUsers(Array.isArray(res.data) ? res.data : [])).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await calendarAPI.getAll({ 
        month: currentDate.getMonth() + 1, 
        year: currentDate.getFullYear() 
      });
      setEvents(res.data);
    } catch (err) {
      console.error("Failed to load events", err);
    } finally {
      setLoading(false);
    }
  };

  // Calendar Logic
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    let startDay = firstDayOfMonth.getDay(); 
    startDay = startDay === 0 ? 6 : startDay - 1; 
    
    const days = [];
    
    // Padding prev month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, month: 'prev', fullDate: new Date(year, month - 1, prevMonthLastDay - i) });
    }
    
    // Current month
    const today = new Date();
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ 
        day: i, 
        month: 'curr', 
        fullDate: d,
        today: d.toDateString() === today.toDateString()
      });
    }
    
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, month: 'next', fullDate: new Date(year, month + 1, i) });
    }
    
    return days;
  }, [currentDate]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [entryForm, setEntryForm] = useState({
    title: '',
    entry_type: 'event',
    start_time: '09:00',
    end_time: '18:00',
    description: ''
  });

  const openUserCalendar = async (u: any) => {
    setViewingUser(u);
    setUserCalDate(new Date());
    setUserCalLoading(true);
    try {
      const [evRes, attRes, leaveRes] = await Promise.all([
        calendarAPI.getUserEvents(u.id, { month: new Date().getMonth() + 1, year: new Date().getFullYear() }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/attendance/report?user_id=${u.id}&start_date=${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-01&end_date=${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-31`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/leaves/all?user_id=${u.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
      ]);
      const events = Array.isArray(evRes.data) ? evRes.data : [];
      const att = Array.isArray(attRes) ? attRes.map((a: any) => ({ id: `att-${a.id}`, title: `${a.status?.replace('_',' ')} ${a.check_in_time ? '· '+a.check_in_time.slice(11,16) : ''}`, entry_type: a.status === 'present' || a.status === 'late' ? 'task' : a.status === 'on_leave' ? 'holiday' : 'week_off', start_time: a.date })) : [];
      const leaves = Array.isArray(leaveRes) ? leaveRes.filter((l: any) => l.status === 'approved').map((l: any) => ({ id: `leave-${l.id}`, title: `Leave: ${l.leave_type?.replace('_',' ')}`, entry_type: 'holiday', start_time: l.start_date })) : [];
      setUserEvents([...events, ...att, ...leaves]);
    } catch { setUserEvents([]); }
    finally { setUserCalLoading(false); }
  };

  const changeUserCalMonth = async (offset: number) => {
    const nd = new Date(userCalDate.getFullYear(), userCalDate.getMonth() + offset, 1);
    setUserCalDate(nd);
    setUserCalLoading(true);
    try {
      const m = nd.getMonth() + 1;
      const y = nd.getFullYear();
      const pad = (n: number) => String(n).padStart(2,'0');
      const [evRes, attRes] = await Promise.all([
        calendarAPI.getUserEvents(viewingUser.id, { month: m, year: y }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/attendance/report?user_id=${viewingUser.id}&start_date=${y}-${pad(m)}-01&end_date=${y}-${pad(m)}-31`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
      ]);
      const events = Array.isArray(evRes.data) ? evRes.data : [];
      const att = Array.isArray(attRes) ? attRes.map((a: any) => ({ id: `att-${a.id}`, title: `${a.status?.replace('_',' ')} ${a.check_in_time ? '· '+a.check_in_time.slice(11,16) : ''}`, entry_type: a.status === 'present' || a.status === 'late' ? 'task' : a.status === 'on_leave' ? 'holiday' : 'week_off', start_time: a.date })) : [];
      setUserEvents([...events, ...att]);
    } catch { setUserEvents([]); }
    finally { setUserCalLoading(false); }
  };

  const openModal = (date: any) => {
    setSelectedDay(date);
    setEntryForm({ ...entryForm, title: '', description: '' });
    setIsModalOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!entryForm.title) return alert("Please enter a title");
    
    try {
      const d = selectedDay.fullDate;
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${entryForm.start_time}:00`;
      const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${entryForm.end_time}:00`;

      await calendarAPI.create({
        ...entryForm,
        start_time: start,
        end_time: end,
        all_day: false
      });
      setIsModalOpen(false);
      loadEvents();
    } catch (err) {
      console.error("Failed to save entry", err);
      alert("Error saving entry");
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await calendarAPI.delete(id);
      loadEvents();
    } catch (err) {
      alert("Error deleting entry");
    }
  };

  const overviewStats = [
    { label: 'Events', value: events.filter(e=>e.entry_type==='event').length, color: 'bg-orange-500', icon: <FiCalendar /> },
    { label: 'Completed', value: events.filter(e=>e.entry_type==='task').length, color: 'bg-emerald-500', icon: <FiCheckCircle /> },
    { label: 'Pending', value: 0, color: 'bg-rose-500', icon: <FiAlertCircle /> },
    { label: 'Task Done', value: 0, color: 'bg-amber-600', icon: <FiList /> },
    { label: 'Off Days', value: events.filter(e=>e.entry_type==='week_off').length, color: 'bg-sky-500', icon: <FiClock /> },
    { label: 'Holidays', value: events.filter(e=>e.entry_type==='holiday').length, color: 'bg-purple-500', icon: <FiSun /> },
  ];

  const getColorClass = (type: string) => {
    switch (type) {
      case 'holiday': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'task': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'week_off': return 'bg-sky-500/10 text-sky-600 border-sky-500/20';
      default: return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <FiCalendar className="text-primary-500 dark:text-gold" /> Calendar
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Monitor holidays, events, and checklists. View individual tracking for your team.
        </p>
      </div>

      <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl w-fit border border-gray-200 dark:border-white/10">
        <button onClick={() => setActiveTab('my')} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'my' ? 'bg-white dark:bg-gold dark:text-darker shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>My Calendar</button>
        {(user?.role === 'admin' || user?.role === 'marketing_head') && (
          <button onClick={() => setActiveTab('tracking')} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'tracking' ? 'bg-white dark:bg-gold dark:text-darker shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>User Tracking</button>
        )}
      </div>

      {activeTab === 'my' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/2">
                <div className="flex items-center gap-2">
                  <button onClick={() => changeMonth(-1)} className="p-2 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"><FiChevronLeft/></button>
                  <h2 className="text-md font-bold text-gray-900 dark:text-white px-4 min-w-[150px] text-center">
                    {months[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <button onClick={() => changeMonth(1)} className="p-2 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"><FiChevronRight/></button>
                </div>
                <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-bold">Today</button>
              </div>

              <div className="grid grid-cols-7 border-b border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-transparent">
                {daysOfWeek.map(day => (<div key={day} className="py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{day}</div>))}
              </div>
              
              <div className="grid grid-cols-7">
                {calendarDays.map((date, i) => {
                  const dayEvents = events.filter(e => new Date(e.start_time).toDateString() === date.fullDate.toDateString());
                  return (
                    <div key={i} onClick={() => openModal(date)} className={`min-h-[110px] p-2 border-r border-b border-gray-100 dark:border-white/5 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-white/2 ${date.month !== 'curr' ? 'opacity-30' : ''} ${date.today ? 'bg-primary-500/5 dark:bg-gold/5' : ''}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[10px] font-black p-1 rounded-md min-w-[20px] text-center ${date.today ? 'bg-primary-500 dark:bg-gold text-white dark:text-darker' : 'text-gray-900 dark:text-white'}`}>{date.day}</span>
                      </div>
                      <div className="space-y-1">
                        {dayEvents.map(e => (
                          <div key={e.id} className={`text-[9px] font-bold p-1 rounded px-2 border truncate flex justify-between items-center group/ev ${getColorClass(e.entry_type)}`}>
                            <span>{e.title}</span>
                            <button onClick={(ev) => { ev.stopPropagation(); handleDeleteEvent(e.id); }} className="opacity-0 group-hover/ev:opacity-100 text-red-500 hover:text-red-700"><FiTrash2/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-white/5 rounded-2xl p-6">
              <h3 className="text-sm font-black text-gray-900 dark:text-white mb-6 uppercase tracking-widest border-l-4 border-gold pl-3">Summary</h3>
              <div className="space-y-3">
                {overviewStats.map((stat, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/2 rounded-xl border border-transparent">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center text-white text-xs shadow-sm`}>{stat.icon}</div>
                      <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 capitalize">{stat.label}</span>
                    </div>
                    <span className="text-lg font-black text-gray-900 dark:text-white">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden animate-slide-up">
           <div className="p-6 border-b border-gray-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Organization Tracking</h2>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 dark:bg-white/2"><tr className="border-b border-gray-100 dark:border-white/5">{['Employee', 'Department', 'Role', 'Team', 'Action'].map(h => (<th key={h} className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">{h}</th>))}</tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                   {users.filter(u => u.name.toLowerCase().includes(searchUser.toLowerCase())).map((u, i) => (
                     <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/2 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center font-bold text-[10px]">{u.name[0].toUpperCase()}</div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-900 dark:text-white capitalize">{u.name}</p>
                              <p className="text-[10px] text-gray-400 truncate">{u.email || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[10px] font-bold text-gray-500">{u.department_name || '—'}</td>
                        <td className="px-6 py-4"><span className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-white/5 border border-white/10 text-gray-400">{(u.role || '').replace(/_/g, ' ')}</span></td>
                        <td className="px-6 py-4 text-[10px] font-bold text-gray-500">{u.team_name || '—'}</td>
                        <td className="px-6 py-4">
                          <button onClick={() => openUserCalendar(u)} className="text-[10px] font-black text-primary-500 dark:text-gold uppercase tracking-widest hover:underline">View Calendar</button>
                        </td>
                     </tr>
                   ))}
                </tbody>
              </table>
           </div>
        </div>
      )}

      {/* User Calendar Modal */}
      {viewingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-dark-card w-full max-w-4xl rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center font-bold text-sm">{viewingUser.name[0].toUpperCase()}</div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{viewingUser.name}</p>
                  <p className="text-[10px] text-gray-400">{viewingUser.role?.replace(/_/g,' ')} · {viewingUser.department_name || '—'}</p>
                </div>
              </div>
              <button onClick={() => setViewingUser(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400"><FiX size={20}/></button>
            </div>

            <div className="p-5">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => changeUserCalMonth(-1)} className="p-2 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"><FiChevronLeft/></button>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{months[userCalDate.getMonth()]} {userCalDate.getFullYear()}</span>
                <button onClick={() => changeUserCalMonth(1)} className="p-2 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"><FiChevronRight/></button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Present', count: userEvents.filter(e => ['present','late'].some(s => e.title?.toLowerCase().includes(s))).length, color: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' },
                  { label: 'Late', count: userEvents.filter(e => e.title?.toLowerCase().includes('late')).length, color: 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20' },
                  { label: 'Leave', count: userEvents.filter(e => e.entry_type === 'holiday').length, color: 'bg-purple-500/10 text-purple-600 border border-purple-500/20' },
                  { label: 'Events', count: userEvents.filter(e => e.entry_type === 'event').length, color: 'bg-orange-500/10 text-orange-600 border border-orange-500/20' },
                ].map(s => (
                  <div key={s.label} className={`p-3 rounded-xl text-center ${s.color}`}>
                    <p className="text-2xl font-black">{s.count}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest">{s.label}</p>
                  </div>
                ))}
              </div>

              {userCalLoading ? (
                <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"/></div>
              ) : (() => {
                // Build calendar grid for userCalDate
                const year = userCalDate.getFullYear();
                const month = userCalDate.getMonth();
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                let startDay = firstDay.getDay();
                startDay = startDay === 0 ? 6 : startDay - 1;
                const days: any[] = [];
                const prevLast = new Date(year, month, 0).getDate();
                for (let i = startDay - 1; i >= 0; i--) days.push({ day: prevLast - i, curr: false });
                for (let i = 1; i <= lastDay.getDate(); i++) days.push({ day: i, curr: true, date: new Date(year, month, i) });
                while (days.length < 42) days.push({ day: days.length - startDay - lastDay.getDate() + 1, curr: false });

                const getEventsForDay = (d: Date) =>
                  userEvents.filter(e => new Date(e.start_time).toDateString() === d.toDateString());

                const getDayColor = (evs: any[]) => {
                  if (evs.some(e => e.entry_type === 'holiday')) return 'bg-purple-100 dark:bg-purple-500/20';
                  if (evs.some(e => e.title?.toLowerCase().includes('late'))) return 'bg-yellow-100 dark:bg-yellow-500/20';
                  if (evs.some(e => e.entry_type === 'task')) return 'bg-emerald-100 dark:bg-emerald-500/20';
                  if (evs.some(e => e.entry_type === 'event')) return 'bg-orange-100 dark:bg-orange-500/20';
                  return '';
                };

                return (
                  <div>
                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-1">
                      {daysOfWeek.map(d => <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest py-1">{d}</div>)}
                    </div>
                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {days.map((d, i) => {
                        if (!d.curr) return <div key={i} className="h-16 rounded-xl opacity-20" />;
                        const evs = getEventsForDay(d.date);
                        const isToday = d.date.toDateString() === new Date().toDateString();
                        return (
                          <div key={i} className={`h-16 rounded-xl p-1.5 border border-gray-100 dark:border-white/5 ${getDayColor(evs)} ${isToday ? 'ring-2 ring-primary-500 dark:ring-gold-500' : ''}`}>
                            <span className={`text-[10px] font-black block mb-1 ${isToday ? 'text-primary-500 dark:text-gold-500' : 'text-gray-700 dark:text-gray-300'}`}>{d.day}</span>
                            <div className="space-y-0.5">
                              {evs.slice(0,2).map((e: any, ei: number) => (
                                <div key={ei} className={`text-[8px] font-bold truncate px-1 rounded ${getColorClass(e.entry_type)}`}>
                                  {e.entry_type === 'task' ? e.title?.split('·')[0].trim() : e.entry_type === 'holiday' ? 'Leave' : e.title}
                                </div>
                              ))}
                              {evs.length > 2 && <div className="text-[8px] text-gray-400 font-bold">+{evs.length - 2} more</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Legend */}
                    <div className="flex gap-4 mt-4 justify-center flex-wrap">
                      {[
                        { color: 'bg-emerald-200', label: 'Present' },
                        { color: 'bg-yellow-200', label: 'Late' },
                        { color: 'bg-purple-200', label: 'Leave' },
                        { color: 'bg-orange-200', label: 'Event' },
                      ].map(l => (
                        <div key={l.label} className="flex items-center gap-1.5">
                          <div className={`w-3 h-3 rounded ${l.color}`}/>
                          <span className="text-[10px] font-bold text-gray-500">{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in p-4">
          <div className="bg-white dark:bg-dark-card w-full max-w-md rounded-3xl overflow-hidden animate-slide-up border border-white/10">
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-md font-bold text-gray-900 dark:text-white capitalize">Add to {months[currentDate.getMonth()]} {selectedDay?.day}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400"><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Entry Type</label>
                <select value={entryForm.entry_type} onChange={(e)=>setEntryForm({...entryForm, entry_type: e.target.value})} className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none">
                  <option value="event">Event</option>
                  <option value="holiday">Holiday</option>
                  <option value="task">Task</option>
                  <option value="week_off">Week Off</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Title</label>
                <input value={entryForm.title} onChange={(e)=>setEntryForm({...entryForm, title: e.target.value})} type="text" placeholder="Entry name..." className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Start Time</label><input value={entryForm.start_time} onChange={(e)=>setEntryForm({...entryForm, start_time: e.target.value})} type="time" className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none" /></div>
                <div className="space-y-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">End Time</label><input value={entryForm.end_time} onChange={(e)=>setEntryForm({...entryForm, end_time: e.target.value})} type="time" className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none" /></div>
              </div>
              <button onClick={handleSaveEntry} className="w-full py-3 bg-primary-500 dark:bg-gold text-white dark:text-darker rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary-500/20 active:scale-95 transition-all">Save Entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
