'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { taskAPI, clientAPI, orgAPI } from '../../utils/api';
import { useAuth } from '../../utils/AuthContext';
import { 
  FiPlus, FiMessageSquare, FiActivity, FiTrash2, FiX, 
  FiSearch, FiClock, FiCheckCircle, FiAlertCircle, FiLayers, 
  FiList, FiCheck, FiMoreHorizontal, FiCalendar, FiFilter,
  FiChevronDown, FiUser, FiTarget
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import GlowCard from '../../components/GlowCard';

const STATUS_STYLE: Record<string, string> = {
  pending:     'bg-gray-500/10 text-gray-500 border-gray-500/20',
  in_progress: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  review:      'bg-purple-500/10 text-purple-500 border-purple-500/20',
  completed:   'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
};

const PRIORITY_STYLE: Record<string, string> = {
  high:   'bg-red-500/10 text-red-500 border-red-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low:    'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
};

function LuxuryStatCard({ label, value, icon: Icon, cls, onClick, active }: any) {
  return (
    <GlowCard 
      onClick={onClick}
      className={`p-5 cursor-pointer transition-all duration-300 border-2 ${active ? 'border-primary-500/50 dark:border-gold-500/50 ring-4 ring-primary-500/5' : 'border-transparent'}`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${cls} bg-opacity-10 bg-current shadow-inner`}>
           <Icon size={22} />
        </div>
        <div>
          <p className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">{value}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-black tracking-widest">{label}</p>
        </div>
      </div>
      {active && (
        <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-gold-500 animate-pulse" />
      )}
    </GlowCard>
  );
}

export default function TasksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: '', description: '', department: 'general',
    assigned_to: '', team_id: '', department_id: '',
    client_id: '', priority: 'medium', due_date: '',
  });

  const isLeadOrAdmin = ['admin', 'team_lead', 'marketing_head', 'crm_head'].includes(user?.role || '');
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTasks(),
        orgAPI.getTeams().then(r => setTeams(r.data)),
        orgAPI.getMembers().then(r => setMembers(r.data)),
      ]);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const loadTasks = async () => {
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (filterTeam) params.team_id = filterTeam;
      const res = await taskAPI.getAll(params);
      setTasks(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadTasks(); }, [filterStatus, filterTeam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.due_date && formData.due_date < today) {
      alert('Due date cannot be in the past.');
      return;
    }
    setLoading(true);
    try {
      await taskAPI.create(formData);
      setShowModal(false);
      setFormData({ title: '', description: '', department: 'general', assigned_to: '', team_id: '', department_id: '', client_id: '', priority: 'medium', due_date: '' });
      loadTasks();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create task');
    }
    setLoading(false);
  };

  const updateStatus = async (taskId: number, status: string) => {
    await taskAPI.update(taskId, { status });
    loadTasks();
  };

  const deleteTask = async (taskId: number) => {
    if (!confirm('Delete this task?')) return;
    await taskAPI.delete(taskId);
    loadTasks();
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.assigned_name?.toLowerCase().includes(search.toLowerCase())
  );

  const statuses = ['pending', 'in_progress', 'review', 'completed'];
  
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    active: tasks.filter(t => t.status === 'in_progress' || t.status === 'review').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  return (
    <div className="space-y-8 pb-20 animate-fade-in pt-4">
      {/* Cinematic Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 px-1">
        <div className="space-y-1">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 text-primary-500 dark:text-gold-500 mb-2"
          >
            <div className="p-2 bg-primary-500/10 rounded-lg">
               <FiLayers size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Project Operations</span>
          </motion.div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">
            Tasks
          </h1>
        </div>

        <div className="flex items-center gap-3">
           <div className="flex bg-white/50 dark:bg-white/5 backdrop-blur-md p-1.5 rounded-2xl border border-gray-100 dark:border-white/5 flex-1 md:flex-none">
              <button onClick={() => setView('kanban')} 
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'kanban' ? 'bg-white dark:bg-white/10 shadow-lg text-primary-600 dark:text-gold-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                <FiLayers size={14} /> <span className="hidden sm:inline">Kanban</span>
              </button>
              <button onClick={() => setView('list')} 
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'list' ? 'bg-white dark:bg-white/10 shadow-lg text-primary-600 dark:text-gold-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                <FiList size={14} /> <span className="hidden sm:inline">List</span>
              </button>
           </div>
           {isLeadOrAdmin && (
            <button onClick={() => setShowModal(true)} 
              className="px-6 py-4 bg-primary-600 dark:bg-gold-500 text-white dark:text-darker rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] shadow-xl shadow-primary-500/20 dark:shadow-gold-500/10 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap">
              <FiPlus size={16} /> New Task
            </button>
           )}
        </div>
      </div>

      {/* Luxury Stats - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
         <LuxuryStatCard label="Total Tasks" value={stats.total} icon={FiLayers} cls="text-blue-500" onClick={() => setFilterStatus('')} active={filterStatus === ''} />
         <LuxuryStatCard label="Pending" value={stats.pending} icon={FiClock} cls="text-orange-500" onClick={() => setFilterStatus('pending')} active={filterStatus === 'pending'} />
         <LuxuryStatCard label="In Motion" value={stats.active} icon={FiActivity} cls="text-purple-500" onClick={() => setFilterStatus('in_progress')} active={filterStatus === 'in_progress'} />
         <LuxuryStatCard label="Completed" value={stats.completed} icon={FiCheckCircle} cls="text-emerald-500" onClick={() => setFilterStatus('completed')} active={filterStatus === 'completed'} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between px-1">
        <div className="relative w-full md:w-96 group">
          <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search objectives..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white dark:bg-white/5 border border-transparent focus:border-primary-500/30 rounded-[2rem] outline-none text-sm font-bold shadow-sm transition-all dark:text-white" 
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-none relative">
            <FiTarget className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
              className="w-full md:w-48 pl-10 pr-10 py-3.5 bg-white dark:bg-white/5 border border-transparent focus:border-primary-500/30 rounded-2xl outline-none text-[10px] font-black uppercase tracking-widest transition-all appearance-none cursor-pointer dark:text-white">
              <option value="">All Teams</option>
              {teams.map(t => <option key={t.id} value={t.id} className="dark:bg-surface-dark">{t.name}</option>)}
            </select>
            <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'kanban' ? (
          <motion.div 
            key="kanban"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-1"
          >
            {statuses.map((status) => (
              <div key={status} className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-2 mb-1">
                   <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${statusColors[status]} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
                      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">{status.replace('_', ' ')}</h3>
                   </div>
                   <span className="text-[10px] font-black px-2 py-0.5 bg-gray-100 dark:bg-white/5 rounded-lg text-gray-400">{tasks.filter(t => t.status === status).length}</span>
                </div>
                
                <div className="space-y-4 min-h-[100px]">
                   {filteredTasks.filter(t => t.status === status).map(task => (
                     <GlowCard key={task.id} 
                        onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                        className="p-5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group border-transparent hover:border-primary-500/20"
                     >
                        <div className="space-y-3">
                           <div className="flex justify-between items-start gap-2">
                              <p className="font-bold text-sm text-gray-900 dark:text-white leading-snug group-hover:text-primary-500 dark:group-hover:text-gold-500 transition-colors uppercase tracking-tight">{task.title}</p>
                              <span className={`flex-shrink-0 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${PRIORITY_STYLE[task.priority]}`}>{task.priority}</span>
                           </div>
                           
                           <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-400 flex items-center justify-center">
                                 <FiTarget size={10} />
                              </div>
                              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate uppercase tracking-widest">{task.team_name || 'Personal Task'}</p>
                           </div>

                           <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-white/5">
                              <div className="flex items-center gap-1.5">
                                 <div className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-primary-500/20">
                                    {task.assigned_name?.[0] || '?'}
                                 </div>
                                 <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{task.assigned_name?.split(' ')[0] || 'Idle'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-gray-400">
                                 <FiClock size={10} />
                                 <span className="text-[9px] font-black uppercase tracking-tighter">{task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No Deadline'}</span>
                              </div>
                           </div>
                        </div>
                     </GlowCard>
                   ))}
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl mx-1"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest">Details</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest hidden sm:table-cell">Assigned</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest hidden lg:table-cell">Team</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest">Priority</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest">Status</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest hidden md:table-cell">Due</th>
                    <th className="px-8 py-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filteredTasks.map(task => (
                    <tr key={task.id} className="group hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/tasks/${task.id}`)}>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                           <div className={`w-2 h-2 rounded-full ${statusColors[task.status] || 'bg-gray-400'} flex-shrink-0`} />
                           <div>
                              <p className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors uppercase tracking-tight">{task.title}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">By {task.assigned_by_name}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 hidden sm:table-cell">
                        <div className="flex items-center gap-2.5">
                           <div className="w-8 h-8 rounded-xl bg-primary-500 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-primary-500/20 flex-shrink-0">
                              {task.assigned_name?.[0] || '?'}
                           </div>
                           <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate max-w-[100px]">{task.assigned_name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 hidden lg:table-cell">
                         <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{task.team_name || '-'}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${PRIORITY_STYLE[task.priority]}`}>{task.priority}</span>
                      </td>
                      <td className="px-6 py-5" onClick={e => e.stopPropagation()}>
                        <select value={task.status}
                          onChange={e => updateStatus(task.id, e.target.value)}
                          className={`text-[10px] font-black uppercase px-3 md:px-4 py-2 rounded-xl border-0 cursor-pointer outline-none transition-all ${STATUS_STYLE[task.status]}`}
                        >
                          {statuses.map(s => <option key={s} value={s} className="bg-white dark:bg-darker text-darker dark:text-white uppercase">{s.replace('_', ' ')}</option>)}
                        </select>
                      </td>
                      <td className="px-6 py-5 hidden md:table-cell">
                        <div className="flex items-center gap-2 text-gray-500">
                           <FiCalendar size={12} />
                           <span className="text-[10px] font-black uppercase tracking-widest">{task.due_date || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                           {user?.role === 'admin' && (
                            <button onClick={() => deleteTask(task.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><FiTrash2 size={16} /></button>
                           )}
                           <button className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all"><FiMoreHorizontal size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-surface-dark w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border border-white/10 shadow-2xl custom-scrollbar"
          >
            <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center">
                    <FiLayers size={20} />
                 </div>
                 <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">New Objective</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><FiX size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Task Title *</label>
                <input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} 
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary-500/30 rounded-2xl outline-none text-sm font-bold transition-all dark:text-white" placeholder="What needs to be done?" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary-500/30 rounded-2xl outline-none text-sm font-bold transition-all dark:text-white h-32 resize-none" placeholder="Provide context and requirements..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Team Assignment</label>
                  <select value={formData.team_id} onChange={e => setFormData({ ...formData, team_id: e.target.value, assigned_to: '' })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary-500/30 rounded-2xl outline-none text-xs font-bold dark:text-white appearance-none cursor-pointer">
                    <option value="">No Team</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assign Member</label>
                  <select value={formData.assigned_to} onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary-500/30 rounded-2xl outline-none text-xs font-bold dark:text-white appearance-none cursor-pointer">
                    <option value="">Unassigned</option>
                    {members.filter(m => !formData.team_id || String(m.team_id) === formData.team_id).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Priority Level</label>
                  <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary-500/30 rounded-2xl outline-none text-xs font-bold dark:text-white appearance-none cursor-pointer">
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Due Date</label>
                  <input type="date" value={formData.due_date} min={today} onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary-500/30 rounded-2xl outline-none text-sm font-bold dark:text-white" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-4 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-white/10 transition-all active:scale-95">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-[2] py-4 bg-primary-600 dark:bg-gold-500 text-white dark:text-darker rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary-500/20 dark:shadow-gold-500/10 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50">
                  {loading ? 'Saving...' : 'Create Task'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-400',
  in_progress: 'bg-blue-500',
  review: 'bg-purple-500',
  completed: 'bg-emerald-500',
};
