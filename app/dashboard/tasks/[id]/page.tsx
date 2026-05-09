'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { taskAPI, orgAPI, rewardsAPI } from '../../../utils/api';
import { useAuth } from '../../../utils/AuthContext';
import { 
  FiClock, FiUser, FiCalendar, FiActivity, FiUsers, 
  FiEye, FiPlus, FiSend, FiPaperclip, FiMoreHorizontal,
  FiVideo, FiSearch, FiLayout, FiCheckCircle, FiMic, FiSmile, FiBell, FiList, FiAward, FiX
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
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 w-full max-w-[320px] shadow-2xl border border-white/10 animate-scale-in">
             <h2 className="text-[10px] font-black uppercase text-gray-400 mb-4 tracking-widest text-center">Assign {showMemberSelect}</h2>
             <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar space-y-1">
                {allUsers.map(u => (
                  <button key={u.id} onClick={async () => {
                    try {
                      if (showMemberSelect === 'participant') await taskAPI.addParticipant(Number(id), u.id);
                      else await taskAPI.addObserver(Number(id), u.id);
                      setShowMemberSelect(null);
                      loadTask();
                    } catch (err) {}
                  }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-[10px] font-black">{u.name[0]}</div>
                    <div className="text-left font-black text-[12px] text-gray-800 dark:text-gray-100">{u.name}</div>
                  </button>
                ))}
             </div>
             <button onClick={() => setShowMemberSelect(null)} className="w-full mt-4 py-3 text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors">Close</button>
          </div>
        </div>
      )}

      {/* COMPACT SIDEBAR */}
      <div className="w-[340px] h-full flex flex-col border-r border-gray-100 dark:border-white/5 bg-[#F8FAFC] dark:bg-[#08090D] overflow-y-auto custom-scrollbar p-5 space-y-4 pb-20">
        
        {/* GOLD COINS REWARD DISPLAY (EMPLOYEE APPRECIATION) */}
        <div className="bg-gradient-to-br from-yellow-400 to-amber-600 rounded-[20px] p-5 text-white shadow-xl shadow-amber-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-150 transition-transform duration-700"><FiAward size={60}/></div>
            <div className="relative z-10">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">Total Gold Coins Earned</span>
                <div className="flex items-end gap-2 mt-1">
                    <h2 className="text-3xl font-black">{rewards.total_coins}</h2>
                    <span className="text-[10px] font-bold pb-1 opacity-70">Coins in Balance</span>
                </div>
                <p className="text-[9px] mt-2 font-medium opacity-90 leading-tight">Complete tasks on time and maintain perfect attendance to win more rewards!</p>
            </div>
        </div>

        <div className="flex items-center justify-between">
            <h1 className="text-[20px] font-black text-gray-900 dark:text-white tracking-tighter leading-none truncate">{task.title}</h1>
            <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><FiMoreHorizontal size={18}/></button>
        </div>

        <div className="bg-white dark:bg-[#12141D] rounded-[20px] p-4 shadow-sm border border-gray-100 dark:border-white/5">
            <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 leading-relaxed italic opacity-80">{task.description || "No description provided."}</p>
        </div>

        {/* Small Data Cards */}
        <div className="bg-white dark:bg-[#12141D] rounded-[20px] p-5 shadow-sm border border-gray-100 dark:border-white/5 space-y-3">
            {[
                { label: 'OWNER:', value: task.assigned_by_name, color: 'text-orange-600' },
                { label: 'ASSIGNEE:', value: task.assigned_name || 'Unassigned', color: 'text-blue-600' },
                { label: 'DEADLINE:', value: formatDate(task.due_date), color: 'text-indigo-600 font-bold' },
                { label: 'STATUS:', value: task.status.replace('_',' '), color: 'text-blue-500 font-black tracking-widest' },
            ].map((row, i) => (
                <div key={i} className="flex flex-col">
                    <span className="text-[8px] font-black text-gray-300 dark:text-gray-600 tracking-widest">{row.label}</span>
                    <div className={`text-[11px] font-black uppercase mt-0.5 tracking-tight ${row.color}`}>{row.value}</div>
                </div>
            ))}
        </div>

        <div className="bg-white dark:bg-[#12141D] rounded-[20px] p-5 shadow-sm border border-gray-100 dark:border-white/5 space-y-3">
            <div className="flex justify-between items-center"><h3 className="text-[9px] font-black text-gray-300 uppercase">Participants:</h3> <button onClick={() => setShowMemberSelect('participant')} className="text-indigo-500 text-[9px] font-black hover:underline">+ ADD</button></div>
            <div className="space-y-2">
                {task.participants?.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2 font-black text-[11px]"><div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-white/5 flex items-center justify-center border border-indigo-100">{p.name[0]}</div>{p.name}</div>
                    <button onClick={() => handleRemoveMember(p.id, 'participant')} className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><FiX size={12} /></button>
                  </div>
                ))}
                {(!task.participants || task.participants.length === 0) && <p className="text-[10px] text-gray-300 italic px-1">None yet</p>}
            </div>
        </div>

        {/* Observers */}
        <div className="bg-white dark:bg-[#12141D] rounded-[20px] p-5 shadow-sm border border-gray-100 dark:border-white/5 space-y-3">
            <div className="flex justify-between items-center"><h3 className="text-[9px] font-black text-gray-300 uppercase">Observers:</h3> <button onClick={() => setShowMemberSelect('observer')} className="text-purple-500 text-[9px] font-black hover:underline">+ ADD</button></div>
            <div className="space-y-2">
                {task.observers?.map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2 font-black text-[11px]"><div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center border border-purple-100 text-purple-500">{o.name[0]}</div>{o.name}</div>
                    <button onClick={() => handleRemoveMember(o.id, 'observer')} className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><FiX size={12} /></button>
                  </div>
                ))}
                {(!task.observers || task.observers.length === 0) && <p className="text-[10px] text-gray-300 italic px-1">None yet</p>}
            </div>
        </div>

        {/* SHRUNK ACTION TRIAD */}
        <div className="grid grid-cols-3 gap-2">
            <button 
              disabled={task.status === 'in_progress'}
              onClick={() => updateTaskStatus('in_progress')} 
              className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all active:scale-95 ${task.status === 'in_progress' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'}`}>
              <FiActivity size={14}/>
              <span className="text-[8px] font-black uppercase mt-1">{task.status === 'in_progress' ? 'Working' : 'Start'}</span>
            </button>
            <button 
              disabled={task.status === 'review'}
              onClick={() => updateTaskStatus('review')} 
              className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all active:scale-95 ${task.status === 'review' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20'}`}>
              <FiClock size={14}/>
              <span className="text-[8px] font-black uppercase mt-1">Pause</span>
            </button>
            <button 
              disabled={task.status === 'completed'}
              onClick={() => updateTaskStatus('completed')} 
              className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all active:scale-95 ${task.status === 'completed' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'}`}>
              <FiCheckCircle size={14}/>
              <span className="text-[8px] font-black uppercase mt-1">{task.status === 'completed' ? 'Done' : 'Complete'}</span>
            </button>
        </div>

        {/* Panel Tab Buttons */}
        <div className="grid grid-cols-2 gap-2 pb-10">
            {([
              { key: 'logs',     icon: <FiCheckCircle size={13}/>, label: 'Logs',     color: 'hover:text-green-500' },
              { key: 'alerts',   icon: <FiBell size={13}/>,        label: 'Alerts',   color: 'hover:text-red-500' },
              { key: 'subtasks', icon: <FiList size={13}/>,        label: 'Subtasks', color: 'hover:text-indigo-500' },
              { key: 'history',  icon: <FiClock size={13}/>,       label: 'History',  color: 'hover:text-orange-500' },
            ] as const).map(tab => (
                <button key={tab.key} onClick={() => setActivePanel(p => p === tab.key ? 'chat' : tab.key)}
                  className={`flex items-center gap-2 p-3 border rounded-xl text-[10px] font-black transition-all ${
                    activePanel === tab.key
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                      : `bg-white dark:bg-[#12141D] border-gray-100 dark:border-white/10 text-gray-400 ${tab.color}`
                  }`}>
                    {tab.icon} <span className="truncate">{tab.label}</span>
                </button>
            ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col h-full bg-[#E4EDF6] dark:bg-[#0A0B10] relative">
         <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7z' fill='%232563eb'/%3E%3C/svg%3E")` }} />

         {/* Header */}
         <div className="flex items-center justify-between px-8 py-3 bg-white/80 dark:bg-dark-card/90 backdrop-blur-3xl border-b border-gray-100 dark:border-white/5 z-40">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-xl"><FiLayout size={18}/></div>
               <div>
                  <h2 className="text-[13px] font-black text-gray-900 dark:text-gray-100 tracking-tight leading-none mb-0.5">
                    {activePanel === 'chat' ? 'Task Chat' : activePanel === 'logs' ? 'Activity Logs' : activePanel === 'subtasks' ? 'Subtasks' : activePanel === 'history' ? 'History' : 'Alerts'}
                  </h2>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest opacity-70">{(task.participants?.length || 0) + 1} MEMBERS</p>
               </div>
            </div>
            <div className="flex items-center gap-2">
              {activePanel !== 'chat' && (
                <button onClick={() => setActivePanel('chat')} className="px-3 py-1.5 text-[9px] font-black text-gray-400 hover:text-indigo-500 border border-gray-200 dark:border-white/10 rounded-lg transition-all">← Back to Chat</button>
              )}
            </div>
         </div>

         {/* CHAT PANEL */}
         {activePanel === 'chat' && (
           <>
             <div className="flex-1 overflow-y-auto px-8 pt-8 pb-32 space-y-4 z-0 custom-scrollbar scroll-smooth">
                {messages.filter(m => m.message_type !== 'subtask').map((msg, i) => {
                    const isMe = msg.user_id === user?.id;
                    const isSystem = msg.message_type === 'system';
                    if (isSystem) return (<div key={i} className="flex justify-center my-3"><div className="px-4 py-2 bg-blue-100/20 dark:bg-blue-500/10 border border-blue-500/10 rounded-xl text-[9px] font-black text-blue-600 tracking-tight shadow-sm backdrop-blur-sm uppercase">Log: {msg.content}</div></div>);
                    return (
                        <div key={i} className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''} animate-slide-up`}>
                            <div className={`w-8 h-8 rounded-lg bg-indigo-500 shadow-md flex-shrink-0 flex items-center justify-center text-[10px] font-black text-white ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'}`}>{msg.user_name[0]}</div>
                            <div className={`max-w-[75%] ${isMe ? 'items-end' : ''} flex flex-col`}>
                                <div className="text-[8px] text-gray-400 font-black uppercase tracking-tight mb-1 px-1">{msg.user_name}</div>
                                <div className={`p-3 px-5 rounded-[18px] text-[12px] leading-relaxed shadow-lg ${isMe ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-600/10' : 'bg-white dark:bg-[#12141D] text-gray-700 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-white/5'}`}>
                                    {msg.content}
                                    <div className={`text-[8px] mt-1.5 text-right font-black opacity-60 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
             </div>
             <div className="absolute bottom-5 inset-x-6 z-[100]">
                <form onSubmit={handleSendMessage} className="bg-white dark:bg-dark-card rounded-[18px] border border-gray-200 dark:border-white/10 shadow-2xl p-1.5 flex items-end gap-1.5 transition-all ring-4 ring-indigo-500/5 group">
                    <button type="button" className="p-2.5 text-gray-300 hover:text-indigo-500 mt-1"><FiPaperclip size={16}/></button>
                    <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Message..." rows={1}
                        className="flex-1 py-3 bg-transparent outline-none text-[12px] font-medium text-gray-700 dark:text-gray-200 placeholder:text-gray-300 resize-none max-h-24 custom-scrollbar" />
                    <div className="flex items-center gap-1 p-0.5 mt-1">
                        <button type="submit" className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xl shadow-indigo-500/20 hover:scale-110 active:scale-95 transition-all"><FiSend size={16}/></button>
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
