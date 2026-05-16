'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { taskAPI, orgAPI, rewardsAPI } from '../../../utils/api';
import { useAuth } from '../../../utils/AuthContext';
import { 
  FiClock, FiUser, FiCalendar, FiActivity, FiUsers, 
  FiEye, FiPlus, FiSend, FiPaperclip, FiMoreHorizontal,
  FiVideo, FiSearch, FiLayout, FiCheckCircle, FiMic, FiSmile, FiBell, FiList, FiAward, FiX, FiTrash2, FiCornerUpRight
} from 'react-icons/fi';

/**
 * High-Density Compact Task Detail UI (CHINNATHA)
 * Includes Gold Coin Rewards for Employee Appreciation.
 */
export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [task, setTask] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any>({ total_coins: 0, history: [] });
  const [newMessage, setNewMessage] = useState('');
  const [showMemberSelect, setShowMemberSelect] = useState<'participant' | 'observer' | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [activePanel, setActivePanel] = useState<'chat' | 'logs' | 'subtasks' | 'history' | 'alerts'>('chat');
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTask();
    loadMessages();
    loadRewards();
    orgAPI.getMembers().then(r => setAllUsers(r.data)).catch(() => {});
    const interval = setInterval(() => { loadTask(); loadMessages(); loadRewards(); }, 5000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  const loadTask = async () => {
    try {
      const res = await taskAPI.getById(Number(id));
      setTask(res.data);
    } catch (err) {
      router.push('/dashboard/tasks');
    }
  };

  const loadMessages = async () => {
    try {
      const res = await taskAPI.getMessages(Number(id));
      setMessages(res.data);
    } catch (err) {}
  };

  const handleDeleteMessage = async (msgId: number) => {
    if (!confirm('Delete this message?')) return;
    try {
      await taskAPI.deleteMessage(Number(id), msgId);
      loadMessages();
    } catch (err) {
      alert('Failed to delete message');
    }
  };

  const handleForwardMessage = (content: string) => {
    if (!content) return;
    setNewMessage(`[Forwarded]: ${content}`);
    alert('Message content placed into the composer box for you.');
  };

  const loadRewards = async () => {
    try {
      const res = await rewardsAPI.getStats();
      setRewards(res.data);
    } catch (err) {}
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;
    try {
      await taskAPI.sendMessage(Number(id), { content: newMessage });
      setNewMessage('');
      loadMessages();
    } catch (err) {}
  };

  const updateTaskStatus = async (status: string) => {
    try {
      await taskAPI.update(Number(id), { status });
      await taskAPI.sendMessage(Number(id), { 
        content: `updated status to ${status.toUpperCase().replace('_', ' ')}`, 
        message_type: 'system' 
      });
      loadTask();
      loadMessages();
      loadRewards(); // Refresh coins after completion
    } catch (err) {}
  };

  const handleRemoveMember = async (userId: number, type: 'participant' | 'observer') => {
    if (!confirm(`Remove this ${type}?`)) return;
    try {
      if (type === 'participant') await taskAPI.removeParticipant(Number(id), userId);
      else await taskAPI.removeObserver(Number(id), userId);
      loadTask();
    } catch (err) {}
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    try {
      await taskAPI.sendMessage(Number(id), { content: `[SUBTASK] ${newSubtask}`, message_type: 'subtask' });
      setNewSubtask('');
      loadMessages();
    } catch (err) {}
  };

  const toggleSubtask = async (msg: any) => {
    const isDone = msg.content.startsWith('[SUBTASK_DONE]');
    const text = msg.content.replace('[SUBTASK_DONE] ', '').replace('[SUBTASK] ', '');
    // We use a system message to track toggle — simplest approach without a new table
    await taskAPI.sendMessage(Number(id), {
      content: isDone ? `[SUBTASK] ${text}` : `[SUBTASK_DONE] ${text}`,
      message_type: 'subtask'
    });
    loadMessages();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'No Date';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (!task) return <div className="flex h-full items-center justify-center animate-pulse text-indigo-500 font-bold text-xs">Loading...</div>;

  return (
    <div className="flex h-[calc(100vh-64px)] -mt-10 -mx-6 overflow-hidden bg-[#F8FAFC] dark:bg-[#08090D] relative font-sans">
      
      {showMemberSelect && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[600] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-[360px] shadow-2xl border border-white/10 animate-scale-in overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/5">
              <div>
                <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-800 dark:text-white">
                  {showMemberSelect === 'participant' ? '👥 Participants' : '👁️ Observers'}
                </h2>
                <p className="text-[9px] text-gray-400 mt-0.5">Add or remove members</p>
              </div>
              <button onClick={() => { setShowMemberSelect(null); setMemberSearch(''); }} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><FiX size={16}/></button>
            </div>

            {/* Current members */}
            {(() => {
              const current = showMemberSelect === 'participant' ? task?.participants : task?.observers;
              return current && current.length > 0 ? (
                <div className="px-5 pt-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Current</p>
                  <div className="flex flex-wrap gap-2">
                    {current.map((m: any) => (
                      <div key={m.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black ${
                        showMemberSelect === 'participant'
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600'
                          : 'bg-purple-50 dark:bg-purple-500/10 text-purple-600'
                      }`}>
                        <span>{m.name}</span>
                        <button onClick={() => handleRemoveMember(m.id, showMemberSelect!)} className="hover:text-red-500 transition-colors ml-0.5">
                          <FiX size={10}/>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Search */}
            <div className="px-5 pt-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Add Member</p>
              <div className="relative">
                <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search by name..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-[12px] outline-none dark:text-white"
                />
              </div>
            </div>

            {/* User list */}
            <div className="px-5 py-3 max-h-52 overflow-y-auto custom-scrollbar space-y-1">
              {allUsers
                .filter(u => {
                  const current = showMemberSelect === 'participant' ? task?.participants : task?.observers;
                  const alreadyAdded = current?.some((m: any) => m.id === u.id);
                  const matchSearch = u.name.toLowerCase().includes(memberSearch.toLowerCase());
                  return !alreadyAdded && matchSearch;
                })
                .map(u => (
                  <button key={u.id} onClick={async () => {
                    try {
                      if (showMemberSelect === 'participant') await taskAPI.addParticipant(Number(id), u.id);
                      else await taskAPI.addObserver(Number(id), u.id);
                      loadTask();
                      setMemberSearch('');
                    } catch (err) {}
                  }} className="w-full flex items-center gap-3 p-2.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all text-left">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${
                      showMemberSelect === 'participant'
                        ? 'bg-indigo-500/10 text-indigo-500'
                        : 'bg-purple-500/10 text-purple-500'
                    }`}>{u.name[0]}</div>
                    <div>
                      <p className="text-[12px] font-black text-gray-800 dark:text-gray-100">{u.name}</p>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide">{u.role?.replace('_', ' ')}</p>
                    </div>
                    <FiPlus size={14} className="ml-auto text-gray-300" />
                  </button>
                ))
              }
              {allUsers.filter(u => {
                const current = showMemberSelect === 'participant' ? task?.participants : task?.observers;
                const alreadyAdded = current?.some((m: any) => m.id === u.id);
                return !alreadyAdded && u.name.toLowerCase().includes(memberSearch.toLowerCase());
              }).length === 0 && (
                <p className="text-center text-[10px] text-gray-400 py-4">No members to add</p>
              )}
            </div>

            <div className="px-5 pb-4">
              <button onClick={() => { setShowMemberSelect(null); setMemberSearch(''); }} className="w-full py-2.5 text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest border border-gray-100 dark:border-white/10 rounded-xl transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* COMPACT SIDEBAR */}
      {/* PREMIUM MODERNISED SIDEBAR */}
      <div className="w-[360px] h-full flex flex-col border-r border-gray-200 dark:border-white/5 bg-[#ffffff] dark:bg-[#0B0E14] overflow-y-auto custom-scrollbar shadow-sm">
        
        {/* Gold Rewards Banner - Re-styled to be more integrated */}
        <div className="px-5 pt-6 pb-4">
            <div className="bg-[#D97706] rounded-2xl p-5 text-white shadow-xl shadow-amber-700/20 relative overflow-hidden flex items-center justify-between gap-3 animate-fade-in">
                {/* Subtle vector pattern */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(#fff 1px, transparent 1px)`, backgroundSize: '10px 10px' }}></div>
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full"></div>
                <div className="relative z-10 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Rewards Balance</p>
                    <div className="text-3xl font-black flex items-end gap-1.5 leading-none mt-1">{rewards.total_coins} <span className="text-[11px] font-bold mb-1 opacity-80">GOLD COINS</span></div>
                </div>
                <div className="relative z-10 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 shadow-inner text-white"><FiAward size={24}/></div>
            </div>
        </div>

        {/* Task Main Info Card */}
        <div className="px-5 pb-5 border-b border-gray-100 dark:border-white/5">
            <div className="flex justify-between items-start gap-3 mb-3">
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">{task.title}</h1>
                <button className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"><FiMoreHorizontal size={18}/></button>
            </div>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
               {task.description || "No description set for this task."}
            </p>
        </div>

        {/* Structured Information Rows - MATCHES REFERENCE LOOK */}
        <div className="p-5 space-y-5">
            <div className="space-y-4">
                {/* Owner */}
                <div className="flex items-start group">
                    <span className="w-24 text-[12px] font-medium text-gray-400 dark:text-gray-500 pt-0.5 flex-shrink-0">Task owner:</span>
                    <div className="flex items-center gap-2 flex-1">
                        <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-[10px] font-bold text-orange-600 dark:text-orange-300 border border-orange-200 dark:border-transparent">{task.assigned_by_name?.[0] || 'A'}</div>
                        <span className="text-[13px] font-bold text-gray-800 dark:text-gray-200">{task.assigned_by_name || 'Manager'}</span>
                    </div>
                </div>

                {/* Assignee */}
                <div className="flex items-start group">
                    <span className="w-24 text-[12px] font-medium text-gray-400 dark:text-gray-500 pt-0.5 flex-shrink-0">Assignee:</span>
                    <div className="flex items-center gap-2 flex-1">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-transparent">{task.assigned_name?.[0] || 'U'}</div>
                        <span className="text-[13px] font-bold text-gray-800 dark:text-gray-200">{task.assigned_name || 'Unassigned'}</span>
                    </div>
                </div>

                {/* Deadline */}
                <div className="flex items-start group">
                    <span className="w-24 text-[12px] font-medium text-gray-400 dark:text-gray-500 pt-0.5 flex-shrink-0">Deadline:</span>
                    <div className="flex flex-col gap-1.5 flex-1">
                        <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
                            <FiCalendar size={14}/>
                            <span className="text-[13px] font-bold">{formatDate(task.due_date)}</span>
                        </div>
                        {task.due_date && new Date(task.due_date) < new Date() && (
                            <div className="inline-flex items-center w-fit px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-900/30 text-[10px] font-bold text-red-500">Overdue</div>
                        )}
                    </div>
                </div>

                {/* Status */}
                <div className="flex items-center group">
                    <span className="w-24 text-[12px] font-medium text-gray-400 dark:text-gray-500 flex-shrink-0">Status:</span>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border ${
                        task.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-transparent' :
                        task.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-transparent' :
                        'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-transparent'
                    }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {task.status.replace('_', ' ')}
                    </div>
                </div>
            </div>

            <div className="w-full h-px bg-gray-100 dark:bg-white/5 my-1"></div>

            {/* Participants & Observers Grouped like Reference */}
            <div className="space-y-4">
                <div className="flex items-start justify-between">
                    <span className="w-24 text-[12px] font-medium text-gray-400 dark:text-gray-500 pt-0.5 flex-shrink-0">Participants:</span>
                    <div className="flex-1">
                        <div className="flex flex-wrap gap-2">
                            {task.participants?.map((p: any) => (
                                <div key={p.id} className="group/item relative flex items-center gap-2 pr-2 pl-1 py-1 bg-gray-50 dark:bg-white/5 rounded-full border border-gray-100 dark:border-white/10 shadow-sm transition-all hover:bg-white dark:hover:bg-white/10">
                                    <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-gray-800 shadow-sm">{p.name[0]}</div>
                                    <span className="text-[12px] font-bold text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{p.name.split(' ')[0]}</span>
                                    <button onClick={() => handleRemoveMember(p.id, 'participant')} className="text-gray-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity absolute -top-1 -right-1 bg-white dark:bg-gray-900 rounded-full shadow-sm p-0.5"><FiX size={10}/></button>
                                </div>
                            ))}
                            <button onClick={() => setShowMemberSelect('participant')} className="w-7 h-7 rounded-full border border-dashed border-gray-300 dark:border-white/20 flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:border-indigo-500 transition-all"><FiPlus size={14}/></button>
                        </div>
                    </div>
                </div>

                <div className="flex items-start justify-between">
                    <span className="w-24 text-[12px] font-medium text-gray-400 dark:text-gray-500 pt-0.5 flex-shrink-0">Observers:</span>
                    <div className="flex-1">
                        <div className="flex flex-wrap gap-2">
                            {task.observers?.map((o: any) => (
                                <div key={o.id} className="group/item relative flex items-center gap-2 pr-2 pl-1 py-1 bg-gray-50 dark:bg-white/5 rounded-full border border-gray-100 dark:border-white/10 shadow-sm transition-all hover:bg-white dark:hover:bg-white/10">
                                    <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-gray-800 shadow-sm">{o.name[0]}</div>
                                    <span className="text-[12px] font-bold text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{o.name.split(' ')[0]}</span>
                                    <button onClick={() => handleRemoveMember(o.id, 'observer')} className="text-gray-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity absolute -top-1 -right-1 bg-white dark:bg-gray-900 rounded-full shadow-sm p-0.5"><FiX size={10}/></button>
                                </div>
                            ))}
                            <button onClick={() => setShowMemberSelect('observer')} className="w-7 h-7 rounded-full border border-dashed border-gray-300 dark:border-white/20 flex items-center justify-center text-gray-400 hover:text-purple-500 hover:border-purple-500 transition-all"><FiPlus size={14}/></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-auto p-5 space-y-5">
            {/* Task Status Control Group */}
            <div className="flex gap-2">
                <button 
                  disabled={task.status === 'in_progress'}
                  onClick={() => updateTaskStatus('in_progress')} 
                  className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-2 shadow-sm ${
                    task.status === 'in_progress' 
                    ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-blue-500/5' 
                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 active:scale-[0.98]'
                  }`}>
                  <FiActivity size={14}/>
                  Start
                </button>
                <button 
                  disabled={task.status === 'review'}
                  onClick={() => updateTaskStatus('review')} 
                  className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-2 shadow-sm ${
                    task.status === 'review' 
                    ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-amber-500/5' 
                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 active:scale-[0.98]'
                  }`}>
                  <FiClock size={14}/>
                  Pause
                </button>
                <button 
                  disabled={task.status === 'completed'}
                  onClick={() => updateTaskStatus('completed')} 
                  className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.98] text-white ${
                    task.status === 'completed'
                    ? 'bg-emerald-600 border border-emerald-700 shadow-emerald-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                  }`}>
                  <FiCheckCircle size={14}/>
                  {task.status === 'completed' ? 'Done' : 'Finish'}
                </button>
            </div>

            {/* Tabbed Nav Grid */}
            <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'logs',     icon: <FiCheckCircle size={14}/>, label: 'Task Logs',     color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' },
                  { key: 'subtasks', icon: <FiList size={14}/>,        label: 'Subtasks',      color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' },
                  { key: 'history',  icon: <FiClock size={14}/>,       label: 'Activity',      color: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10' },
                  { key: 'alerts',   icon: <FiBell size={14}/>,        label: 'Alerts',        color: 'text-red-600 bg-red-50 dark:bg-red-500/10' },
                ] as const).map(tab => (
                    <button key={tab.key} onClick={() => setActivePanel(p => p === tab.key ? 'chat' : tab.key)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all border ${
                        activePanel === tab.key
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-600 ring-opacity-20'
                          : `bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 hover:shadow-sm hover:border-gray-200`
                      }`}>
                        <div className={`p-1.5 rounded-lg ${activePanel === tab.key ? 'bg-white/20' : tab.color}`}>
                            {tab.icon}
                        </div>
                        <span className="truncate">{tab.label}</span>
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      {/* RIGHT PANEL (Chat Area) */}
      <div className="flex-1 flex flex-col h-full bg-[#94b9d8] dark:bg-[#0A0B10] relative overflow-hidden">
         {/* Patterned Background */}
         <div className="absolute inset-0 opacity-[0.15] dark:opacity-[0.05]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7z' fill='%23ffffff' fill-opacity='0.5'/%3E%3Cpath d='M45 65c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm30-40c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 1.8-4 4 1.8 4 4 4z' fill='%23ffffff' fill-opacity='0.5'/%3E%3Cpath d='M20 80l5-5 5 5-5 5zM80 80l5-5 5 5-5 5zM50 20l5-5 5 5-5 5z' fill='%23ffffff' fill-opacity='0.5'/%3E%3C/svg%3E")` }} />

         {/* Enhanced Header with Actions matching Reference Image */}
         <div className="flex items-center justify-between px-6 py-3 bg-white/90 dark:bg-dark-card/90 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 z-40 shadow-sm">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center"><FiMessageSquare size={18}/></div>
               <div>
                  <h2 className="text-[14px] font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-none mb-0.5">
                    {activePanel === 'chat' ? 'Task chat' : activePanel === 'logs' ? 'Activity Logs' : activePanel === 'subtasks' ? 'Subtasks' : activePanel === 'history' ? 'History' : 'Alerts'}
                  </h2>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 opacity-80">{(task.participants?.length || 0) + 1} members</p>
               </div>
            </div>
            
            <div className="flex items-center gap-3">
               {activePanel === 'chat' && (
                 <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#8e44ad] hover:bg-[#732d91] text-white rounded-lg text-xs font-bold shadow-md transition-all">
                       <FiVideo size={14} /> <span>Video call</span>
                    </button>
                    <div className="h-6 w-[1px] bg-gray-200 dark:bg-white/10 mx-1"></div>
                    <button className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full transition-colors"><FiUsers size={16} /></button>
                    <button className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full transition-colors"><FiSearch size={16} /></button>
                 </div>
               )}
               {activePanel !== 'chat' && (
                 <button onClick={() => setActivePanel('chat')} className="px-3 py-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg hover:bg-indigo-100 transition-all">← Back to Chat</button>
               )}
            </div>
         </div>

         {/* CHAT PANEL */}
         {activePanel === 'chat' && (
           <>
             <div className="flex-1 overflow-y-auto px-6 py-6 space-y-2 z-0 custom-scrollbar scroll-smooth pb-28">
                {(() => {
                   let lastDate = '';
                   const msgs = messages.filter(m => m.message_type !== 'subtask');
                   
                   return msgs.map((msg, i) => {
                      const dateObj = new Date(msg.created_at);
                      const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                      let showDateSeparator = false;
                      
                      if (formattedDate !== lastDate) {
                         showDateSeparator = true;
                         lastDate = formattedDate;
                      }

                      const isMe = msg.user_id === user?.id;
                      const isSystem = msg.message_type === 'system';

                      return (
                         <React.Fragment key={i}>
                            {/* Date Separator Pill like Screenshot */}
                            {showDateSeparator && (
                               <div className="flex justify-center my-6 animate-fade-in">
                                  <div className="px-4 py-1.5 bg-black/15 dark:bg-white/10 backdrop-blur-md rounded-full text-[11px] font-medium text-gray-700 dark:text-gray-200 shadow-sm border border-white/10">
                                     {formattedDate}
                                  </div>
                               </div>
                            )}

                            {/* System Event Notification Box (exactly like screenshot layout) */}
                            {isSystem ? (
                               <div className="flex justify-start my-1.5 animate-slide-up max-w-3xl">
                                  <div className="relative px-4 py-3 bg-white/20 dark:bg-white/5 backdrop-blur-sm border border-white/30 dark:border-white/10 rounded-xl w-full shadow-sm text-[12px] flex flex-col items-start group overflow-hidden">
                                     <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-400/50"></div>
                                     <div className="flex items-center justify-between w-full">
                                        <p className="text-gray-800 dark:text-gray-100 leading-snug font-medium">
                                           <span className="text-blue-700 dark:text-blue-300 font-bold underline cursor-pointer hover:no-underline mr-1">{msg.user_name}</span> 
                                           {msg.content}
                                        </p>
                                        <span className="text-[9px] text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap ml-3">
                                           {dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                                        </span>
                                     </div>
                                  </div>
                               </div>
                            ) : (
                               /* Regular Chat Bubble with modern style */
                               <div className={`flex items-start gap-2.5 mb-2 ${isMe ? 'flex-row-reverse' : ''} animate-slide-up`}>
                                   {/* User Avatar */}
                                   <div className={`w-8 h-8 rounded-full ${isMe ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'} flex-shrink-0 flex items-center justify-center text-[12px] font-bold text-white border border-white shadow-sm`}>
                                      {msg.user_name[0]}
                                   </div>
                                   <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}>
                                       {!isMe && <div className="text-[11px] text-gray-700 dark:text-gray-300 font-bold tracking-tight px-1 mb-0.5">{msg.user_name}</div>}
                                       <div className={`p-3 px-4 rounded-2xl text-[13px] leading-relaxed shadow-md transition-transform active:scale-[0.99] ${isMe ? 'bg-[#4a76a8] text-white rounded-tr-none' : 'bg-white dark:bg-[#1A1C23] text-gray-800 dark:text-gray-200 rounded-tl-none'}`}>
                                           {msg.content}
                                           <div className={`text-[9px] mt-1 flex justify-end font-medium opacity-70 gap-1`}>
                                              {dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                                              {isMe && <span>✓✓</span>}
                                           </div>
                                       </div>

                                       {/* Action buttons float */}
                                       <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>
                                           {(isMe || user?.role === 'admin') && (
                                              <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-400 hover:text-red-500 rounded-lg shadow-sm" title="Delete">
                                                 <FiTrash2 size={12}/>
                                              </button>
                                           )}
                                           <button onClick={() => handleForwardMessage(msg.content)} className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-400 hover:text-emerald-500 rounded-lg shadow-sm" title="Forward">
                                              <FiCornerUpRight size={12}/>
                                           </button>
                                       </div>
                                   </div>
                               </div>
                            )}
                         </React.Fragment>
                      );
                   });
                })()}
                <div ref={chatEndRef} />
             </div>

             {/* Clean Floating Input Box like Reference */}
             <div className="absolute bottom-4 inset-x-6 z-50">
                <form onSubmit={handleSendMessage} className="bg-white dark:bg-[#1A1C23] rounded-2xl shadow-xl p-1.5 flex items-center gap-1 border border-gray-100 dark:border-white/10 transition-shadow focus-within:shadow-2xl">
                    <button type="button" className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors rounded-xl"><FiPaperclip size={18}/></button>
                    <input 
                        type="text"
                        value={newMessage} 
                        onChange={(e) => setNewMessage(e.target.value)} 
                        placeholder="Type @ or + to mention a person, a chat or AI..." 
                        className="flex-1 px-3 py-3 bg-transparent outline-none text-[14px] font-medium text-gray-800 dark:text-gray-100 placeholder:text-gray-400" 
                    />
                    <div className="flex items-center gap-1 pr-1">
                        <button type="button" className="p-2 text-gray-400 hover:text-gray-600 rounded-xl transition-colors hidden sm:block"><FiSmile size={18}/></button>
                        <button type="button" className="p-2 text-gray-400 hover:text-gray-600 rounded-xl transition-colors hidden sm:block"><FiMic size={18}/></button>
                        <button type="submit" disabled={!newMessage.trim()} className={`p-3 ${newMessage.trim() ? 'bg-blue-500 text-white shadow-lg' : 'bg-gray-100 text-gray-300'} rounded-xl transition-all active:scale-95`}>
                           <FiSend size={16} />
                        </button>
                    </div>
                </form>
             </div>
           </>
         )}

         {/* LOGS PANEL */}
         {activePanel === 'logs' && (
           <div className="flex-1 overflow-y-auto px-8 py-6 space-y-3 custom-scrollbar">
             {(task.activity || []).length === 0 && <p className="text-center text-gray-400 text-xs mt-10">No activity logs yet.</p>}
             {(task.activity || []).map((log: any, i: number) => (
               <div key={i} className="flex items-start gap-3 p-3 bg-white dark:bg-[#12141D] rounded-xl border border-gray-100 dark:border-white/5">
                 <div className="w-7 h-7 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center flex-shrink-0"><FiCheckCircle size={13}/></div>
                 <div className="flex-1 min-w-0">
                   <p className="text-[11px] font-bold text-gray-800 dark:text-gray-100">
                     <span className="text-indigo-500">{log.user_name}</span> {log.action}
                     {log.new_value && <span className="text-gray-400"> — {log.new_value}</span>}
                   </p>
                   <p className="text-[9px] text-gray-400 mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                 </div>
               </div>
             ))}
           </div>
         )}

         {/* SUBTASKS PANEL */}
         {activePanel === 'subtasks' && (
           <div className="flex-1 overflow-y-auto px-8 py-6 space-y-3 custom-scrollbar pb-32">
             {messages.filter(m => m.message_type === 'subtask').length === 0 && <p className="text-center text-gray-400 text-xs mt-10">No subtasks yet. Add one below.</p>}
             {messages.filter(m => m.message_type === 'subtask').map((msg: any, i: number) => {
               const isDone = msg.content.startsWith('[SUBTASK_DONE]');
               const text = msg.content.replace('[SUBTASK_DONE] ', '').replace('[SUBTASK] ', '');
               return (
                 <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-[#12141D] rounded-xl border border-gray-100 dark:border-white/5">
                   <button onClick={() => toggleSubtask(msg)} className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                     isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-white/20 hover:border-green-400'
                   }`}>{isDone && <FiCheckCircle size={11}/>}</button>
                   <span className={`text-[12px] font-bold flex-1 ${isDone ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>{text}</span>
                   <span className="text-[9px] text-gray-400">{msg.user_name}</span>
                 </div>
               );
             })}
             <div className="absolute bottom-5 inset-x-6 z-[100]">
               <form onSubmit={handleAddSubtask} className="bg-white dark:bg-dark-card rounded-[18px] border border-gray-200 dark:border-white/10 shadow-2xl p-1.5 flex items-center gap-1.5">
                 <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)} placeholder="Add a subtask..." className="flex-1 py-3 px-3 bg-transparent outline-none text-[12px] font-medium text-gray-700 dark:text-gray-200 placeholder:text-gray-300" />
                 <button type="submit" className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xl shadow-indigo-500/20 hover:scale-110 active:scale-95 transition-all"><FiSend size={16}/></button>
               </form>
             </div>
           </div>
         )}

         {/* HISTORY PANEL */}
         {activePanel === 'history' && (
           <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
             <div className="relative border-l-2 border-indigo-200 dark:border-indigo-500/20 ml-3 space-y-6 py-2">
               {(task.activity || []).length === 0 && <p className="text-center text-gray-400 text-xs ml-6">No history yet.</p>}
               {(task.activity || []).map((log: any, i: number) => (
                 <div key={i} className="relative pl-6">
                   <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white dark:border-[#0A0B10] flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-white"/></div>
                   <p className="text-[10px] text-gray-400 font-bold">{new Date(log.created_at).toLocaleString()}</p>
                   <p className="text-[12px] font-bold text-gray-800 dark:text-gray-100 mt-0.5">
                     <span className="text-indigo-500">{log.user_name}</span> {log.action}
                   </p>
                   {log.new_value && <p className="text-[10px] text-gray-500 mt-0.5 italic">{log.new_value}</p>}
                 </div>
               ))}
             </div>
           </div>
         )}

         {/* ALERTS PANEL */}
         {activePanel === 'alerts' && (
           <div className="flex-1 overflow-y-auto px-8 py-6 space-y-3 custom-scrollbar">
             {task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed' && (
               <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                 <FiBell size={16} className="text-red-500 flex-shrink-0 mt-0.5"/>
                 <div>
                   <p className="text-[12px] font-black text-red-600">Task Overdue</p>
                   <p className="text-[10px] text-red-400 mt-0.5">Due date was {new Date(task.due_date).toLocaleDateString()} and task is still {task.status.replace('_',' ')}.</p>
                 </div>
               </div>
             )}
             {task.due_date && (() => { const diff = Math.ceil((new Date(task.due_date).getTime() - Date.now()) / 86400000); return diff > 0 && diff <= 2 && task.status !== 'completed'; })() && (
               <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl">
                 <FiBell size={16} className="text-yellow-500 flex-shrink-0 mt-0.5"/>
                 <div>
                   <p className="text-[12px] font-black text-yellow-600">Due Soon</p>
                   <p className="text-[10px] text-yellow-500 mt-0.5">This task is due in {Math.ceil((new Date(task.due_date).getTime() - Date.now()) / 86400000)} day(s).</p>
                 </div>
               </div>
             )}
             {task.status === 'completed' && (
               <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl">
                 <FiCheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5"/>
                 <div>
                   <p className="text-[12px] font-black text-green-600">Task Completed</p>
                   <p className="text-[10px] text-green-500 mt-0.5">This task has been marked as completed.</p>
                 </div>
               </div>
             )}
             {!task.due_date && task.status !== 'completed' && (
               <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
                 <FiBell size={16} className="text-gray-400 flex-shrink-0 mt-0.5"/>
                 <div>
                   <p className="text-[12px] font-black text-gray-500">No Due Date Set</p>
                   <p className="text-[10px] text-gray-400 mt-0.5">Consider setting a deadline for better tracking.</p>
                 </div>
               </div>
             )}
           </div>
         )}
      </div>
    </div>
  );
}

function FiMessageSquare({ size }: { size?: number }) { return (<svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height={size} width={size}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>); }
