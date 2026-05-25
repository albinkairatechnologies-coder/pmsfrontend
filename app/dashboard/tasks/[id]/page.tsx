'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { taskAPI, orgAPI, rewardsAPI, messageAPI, API_URL } from '../../../utils/api';
import { useAuth } from '../../../utils/AuthContext';
import { 
  FiClock, FiUser, FiCalendar, FiActivity, FiUsers, 
  FiEye, FiPlus, FiSend, FiPaperclip, FiMoreHorizontal,
  FiVideo, FiSearch, FiLayout, FiCheckCircle, FiMic, FiSmile, FiBell, FiList, FiAward, FiX, FiTrash2, FiCornerUpRight,
  FiDownload, FiFile, FiImage, FiCopy, FiEdit2, FiLock, FiLink
} from 'react-icons/fi';

// Helper to parse naive datetime strings (which are stored in IST timezone on the backend)
// so they display accurately in the client's local browser timezone.
export const parseISTDate = (dateStr: string | Date | null | undefined): Date => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  let s = String(dateStr);
  if (!s.includes('Z') && !s.includes('+') && !s.match(/-\d{2}:\d{2}$/)) {
    if (s.includes(':')) {
      s = s.includes('T') ? `${s}+05:30` : `${s.replace(' ', 'T')}+05:30`;
    }
  }
  return new Date(s);
};

// Secure image component that fetches with JWT headers to display native images in task chat
function SecureImage({ filename, alt }: { filename: string; alt: string }) {
  const [src, setSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchImage = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/messages/attachments/${filename}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch image');
        const blob = await res.blob();
        if (active) {
          const url = window.URL.createObjectURL(blob);
          setSrc(url);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (active) setLoading(false);
      }
    };
    fetchImage();
    return () => {
      active = false;
      if (src) window.URL.revokeObjectURL(src);
    };
  }, [filename]);

  if (loading) {
    return (
      <div className="w-48 h-36 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse flex items-center justify-center border border-gray-200 dark:border-white/10">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="w-48 h-36 rounded-xl bg-red-500/10 dark:bg-red-500/5 flex flex-col items-center justify-center text-red-500 p-4 text-center border border-red-500/20">
        <FiImage size={28} className="mb-2" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Failed to load</span>
        <span className="text-[8px] opacity-70 truncate max-w-full">{alt}</span>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className="max-w-full max-h-64 object-contain rounded-xl shadow-lg border border-gray-200 dark:border-white/5 cursor-pointer hover:opacity-90 transition-all"
      onClick={() => {
        const a = document.createElement('a');
        a.href = src;
        a.download = alt;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }}
    />
  );
}

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
  const [subtaskAssignee, setSubtaskAssignee] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);

  const [copied, setCopied] = useState(false);

  // Video Call Integration States & Refs
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const [showVideoCall, setShowVideoCall] = useState(false);

  // Pipeline State Variables
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [showPipeline, setShowPipeline] = useState(false);
  const [selectedStage, setSelectedStage] = useState<any>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editResponsible, setEditResponsible] = useState<string>('');
  const [editStatus, setEditStatus] = useState('pending');
  const [isSavingStage, setIsSavingStage] = useState(false);
  const prevStageNameRef = useRef<string>('');

  useEffect(() => {
    loadTask();
    loadMessages();
    loadSubtasks();
    loadRewards();
    loadPipeline();
    orgAPI.getMembers().then(r => setAllUsers(r.data)).catch(() => {});
    const interval = setInterval(() => { 
      loadTask(); 
      loadMessages(); 
      loadSubtasks(); 
      loadRewards(); 
      loadPipeline();
    }, 5000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  // Sync edit form fields when active pipeline stage tab changes
  useEffect(() => {
    if (selectedStage) {
      const stageName = selectedStage.stage_name;
      if (prevStageNameRef.current !== stageName) {
        setEditStartDate(selectedStage.start_date ? selectedStage.start_date.split('T')[0] : '');
        setEditEndDate(selectedStage.end_date ? selectedStage.end_date.split('T')[0] : '');
        setEditResponsible(selectedStage.responsible_person_id ? String(selectedStage.responsible_person_id) : '');
        setEditStatus(selectedStage.status || 'pending');
        prevStageNameRef.current = stageName;
      }
    } else {
      prevStageNameRef.current = '';
    }
  }, [selectedStage]);

  // Automatically track active stage inside modal during background updates
  useEffect(() => {
    if (showPipeline && pipelineStages.length > 0) {
      const current = getCurrentStage();
      const matched = pipelineStages.find((s: any) => s.stage_name === (selectedStage?.stage_name || current?.stage_name));
      setSelectedStage(matched || current || pipelineStages[0]);
    }
  }, [showPipeline, pipelineStages]);

  // Video Call Integration
  useEffect(() => {
    if (showVideoCall) {
      if ((window as any).JitsiMeetExternalAPI) {
        initJitsi();
        return;
      }

      const script = document.createElement('script');
      script.src = "https://meet.jit.si/external_api.js";
      script.async = true;
      script.onload = () => {
        initJitsi();
      };
      document.body.appendChild(script);

      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, [showVideoCall]);

  const initJitsi = () => {
    if (!jitsiContainerRef.current || !(window as any).JitsiMeetExternalAPI) return;

    if (jitsiApiRef.current) {
      jitsiApiRef.current.destroy();
      jitsiApiRef.current = null;
    }

    const domain = "meet.jit.si";
    const roomName = `KairaFlow_Task_${id}_MeetingRoom`;
    const options = {
      roomName: roomName,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: user?.name || 'Team Member'
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        prejoinPageEnabled: false,
        disableThirdPartyRequests: true,
      },
      interfaceConfigOverwrite: {
        MOBILE_APP_PROMO: false,
        SHOW_JITSI_WATERMARK: false,
        DEEP_LINKING_IMAGE_URL: '',
      }
    };

    const api = new (window as any).JitsiMeetExternalAPI(domain, options);
    jitsiApiRef.current = api;

    api.addEventListener('videoConferenceLeft', () => {
      closeVideoCall();
    });
  };

  const closeVideoCall = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.destroy();
      jitsiApiRef.current = null;
    }
    setShowVideoCall(false);
  };

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

  const loadSubtasks = async () => {
    try {
      const res = await taskAPI.getSubtasks(Number(id));
      setSubtasks(res.data);
    } catch (err) {}
  };

  const loadPipeline = async () => {
    try {
      const res = await taskAPI.getPipeline(Number(id));
      setPipelineStages(res.data);
    } catch (err) {}
  };

  const getCurrentStage = () => {
    if (!pipelineStages || pipelineStages.length === 0) return null;
    const inProgress = pipelineStages.find((s: any) => s.status === 'in_progress');
    if (inProgress) return inProgress;
    const pending = pipelineStages.find((s: any) => s.status === 'pending');
    if (pending) return pending;
    return pipelineStages[pipelineStages.length - 1];
  };

  const handleUpdateStage = async () => {
    if (!selectedStage) return;
    setIsSavingStage(true);
    try {
      await taskAPI.updatePipelineStage(Number(id), selectedStage.stage_name, {
        start_date: editStartDate || null,
        end_date: editEndDate || null,
        responsible_person_id: editResponsible ? Number(editResponsible) : null,
        status: editStatus
      });
      
      prevStageNameRef.current = '';
      const res = await taskAPI.getPipeline(Number(id));
      setPipelineStages(res.data);
      
      const updated = res.data.find((s: any) => s.stage_name === selectedStage.stage_name);
      if (updated) {
        setSelectedStage(updated);
        setEditStartDate(updated.start_date ? updated.start_date.split('T')[0] : '');
        setEditEndDate(updated.end_date ? updated.end_date.split('T')[0] : '');
        setEditResponsible(updated.responsible_person_id ? String(updated.responsible_person_id) : '');
        setEditStatus(updated.status || 'pending');
      }
      
      await loadTask();
      await loadMessages();
    } catch (err) {
      alert("Failed to update pipeline stage");
    } finally {
      setIsSavingStage(false);
    }
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

  const handleCopyMessage = (content: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    alert('Message copied to clipboard!');
  };

  const startEditing = (msg: any) => {
    setEditingMessage(msg);
    setNewMessage(msg.content);
  };

  const cancelEditing = () => {
    setEditingMessage(null);
    setNewMessage('');
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
      if (editingMessage) {
        await taskAPI.editMessage(Number(id), editingMessage.id, newMessage);
        setEditingMessage(null);
      } else {
        await taskAPI.sendMessage(Number(id), { content: newMessage });
      }
      setNewMessage('');
      loadMessages();
    } catch (err) {
      alert(editingMessage ? 'Failed to edit message' : 'Failed to send message');
    }
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
      await taskAPI.createSubtask(Number(id), { 
        title: newSubtask, 
        assigned_to: subtaskAssignee || null 
      });
      setNewSubtask('');
      setSubtaskAssignee('');
      loadSubtasks();
      loadMessages(); // reload chat / activity
    } catch (err) {}
  };

  const toggleSubtask = async (sub: any) => {
    try {
      await taskAPI.updateSubtask(Number(id), sub.id, { 
        is_completed: !sub.is_completed 
      });
      loadSubtasks();
      loadMessages();
    } catch (err) {}
  };

  const handleDeleteSubtask = async (subId: number) => {
    if (!confirm('Are you sure you want to delete this subtask?')) return;
    try {
      await taskAPI.deleteSubtask(Number(id), subId);
      loadSubtasks();
      loadMessages();
    } catch (err) {}
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'No Date';
    const d = parseISTDate(dateStr);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getFileTypeFromFilename = (filename: string) => {
    if (!filename) return 'application/octet-stream';
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return 'image/' + (ext === 'jpg' ? 'jpeg' : ext);
    }
    if (ext === 'pdf') {
      return 'application/pdf';
    }
    return 'application/' + ext;
  };

  const handleDownload = async (filename: string, originalName: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/messages/attachments/${filename}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert('File too large! Maximum attachment size is capped at 20MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await messageAPI.uploadChatMessage(formData);
      const { file_url, file_name, file_type } = uploadRes.data;

      await taskAPI.sendMessage(Number(id), { 
        content: file_name, 
        message_type: 'file',
        file_url: file_url
      });

      loadMessages();
    } catch (err) {
      console.error('Failed to upload file', err);
      alert('File upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
                    <span className="w-24 text-[12px] font-medium text-gray-400 dark:text-gray-500 pt-1.5 flex-shrink-0">Deadline:</span>
                    <div className="flex flex-col gap-1.5 flex-1">
                        {['admin', 'team_lead', 'crm_head', 'marketing_head', 'bdm'].includes(user?.role || '') ? (
                            <div className="flex items-center gap-2 relative">
                                <FiCalendar size={14} className="text-red-500 dark:text-red-400 absolute left-2.5 z-10 pointer-events-none" />
                                <input 
                                    type="date" 
                                    value={task.due_date ? task.due_date.split('T')[0] : ''} 
                                    onChange={async (e) => {
                                        const newDate = e.target.value;
                                        if (!newDate) return;
                                        try {
                                            await taskAPI.update(Number(id), { due_date: newDate });
                                            await taskAPI.sendMessage(Number(id), { 
                                                content: `changed deadline to ${newDate}`, 
                                                message_type: 'system' 
                                            });
                                            loadTask();
                                            loadMessages();
                                        } catch (err) {
                                            alert("Failed to update deadline");
                                        }
                                    }}
                                    className="pl-8 pr-2 py-1 text-xs font-bold text-red-500 dark:text-red-400 bg-red-50/50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl outline-none focus:border-red-500 transition-all cursor-pointer"
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-red-500 dark:text-red-400 pt-0.5">
                                <FiCalendar size={14}/>
                                <span className="text-[13px] font-bold">{formatDate(task.due_date)}</span>
                            </div>
                        )}
                        {task.due_date && parseISTDate(task.due_date) < new Date() && (
                            <div className="inline-flex items-center w-fit px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-900/30 text-[10px] font-bold text-red-500 mt-0.5">Overdue</div>
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

                {/* Project Pipeline */}
                <div className="flex items-center group">
                    <span className="w-24 text-[12px] font-medium text-gray-400 dark:text-gray-500 flex-shrink-0">Pipeline:</span>
                    <button 
                      onClick={() => setShowPipeline(true)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-transparent shadow-sm hover:shadow active:scale-[0.98] transition-all"
                    >
                      <span>🌐</span>
                      <span>
                        {(() => {
                          const current = getCurrentStage();
                          if (!current) return 'View Pipeline';
                          return current.stage_name.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                        })()}
                      </span>
                      <span className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded ${
                        (() => {
                          const current = getCurrentStage();
                          if (!current) return 'bg-gray-100 text-gray-500';
                          if (current.status === 'completed') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
                          if (current.status === 'in_progress') return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 animate-pulse';
                          return 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400';
                        })()
                      }`}>
                        {(() => {
                          const current = getCurrentStage();
                          return current ? current.status.replace('_', ' ') : 'pending';
                        })()}
                      </span>
                    </button>
                </div>

                {/* Magic Tracking Link */}
                <div className="flex items-center group">
                    <span className="w-24 text-[12px] font-medium text-gray-400 dark:text-gray-500 flex-shrink-0">Tracking:</span>
                    {task.status === 'pending' ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-white/5 cursor-not-allowed">
                            <FiLock size={12} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
                            <span>Locked (Start Task First)</span>
                        </div>
                    ) : (
                        <button 
                          onClick={() => {
                            const isProductionPms = window.location.pathname.startsWith('/pms');
                            const link = isProductionPms
                              ? `${window.location.origin}/pms/track/${task.client_tracking_token}`
                              : `${window.location.origin}/track/${task.client_tracking_token}`;
                            navigator.clipboard.writeText(link);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-transparent shadow-sm hover:shadow active:scale-[0.98] transition-all"
                        >
                          {copied ? (
                            <>
                              <FiCheckCircle size={12} className="stroke-[2.5] text-emerald-500" />
                              <span className="text-emerald-500 font-bold">Copied! ✓</span>
                            </>
                          ) : (
                            <>
                              <FiLink size={12} className="stroke-[2.5]" />
                              <span>Copy Magic Link</span>
                            </>
                          )}
                        </button>
                    )}
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
                      <button 
                        onClick={() => setShowVideoCall(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#8e44ad] hover:bg-[#732d91] text-white rounded-lg text-xs font-bold shadow-md transition-all"
                      >
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
                      const dateObj = parseISTDate(msg.created_at);
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
                                            {msg.file_url ? (
                                              <div className="flex flex-col gap-2">
                                                {(() => {
                                                  const fileType = getFileTypeFromFilename(msg.file_url);
                                                  if (fileType.startsWith('image/')) {
                                                    return <SecureImage filename={msg.file_url} alt={msg.content || 'Image'} />;
                                                  } else if (fileType === 'application/pdf') {
                                                    return (
                                                      <div className="flex items-center gap-3 p-3 bg-red-500/10 dark:bg-red-500/5 rounded-xl border border-red-500/20 text-red-700 dark:text-red-400 min-w-[200px] md:min-w-[280px]">
                                                        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0 text-red-500">
                                                          <FiFile size={22} className="stroke-[2.5]" />
                                                        </div>
                                                        <div className="flex-1 min-w-0 text-left">
                                                          <p className="text-xs font-bold truncate">{msg.content}</p>
                                                          <p className="text-[9px] opacity-85 uppercase font-black tracking-widest leading-none">PDF Document</p>
                                                        </div>
                                                        <button 
                                                          type="button"
                                                          onClick={() => handleDownload(msg.file_url, msg.content)}
                                                          className="p-2 hover:bg-red-500/20 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                                                          title="Download PDF"
                                                        >
                                                          <FiDownload size={16} />
                                                        </button>
                                                      </div>
                                                    );
                                                  } else {
                                                    return (
                                                      <div className="flex items-center gap-3 p-3 bg-black/10 dark:bg-white/5 rounded-xl border border-white/10 min-w-[200px] md:min-w-[280px]">
                                                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                                                          <FiFile size={20} />
                                                        </div>
                                                        <div className="flex-1 min-w-0 text-left">
                                                          <p className="text-xs font-bold truncate">{msg.content}</p>
                                                          <p className="text-[9px] opacity-60 uppercase font-black tracking-wider leading-none">{(fileType.split('/')[1] || 'File').toUpperCase()}</p>
                                                        </div>
                                                        <button 
                                                          type="button"
                                                          onClick={() => handleDownload(msg.file_url, msg.content)}
                                                          className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                                                          title="Download File"
                                                        >
                                                          <FiDownload size={16} />
                                                        </button>
                                                      </div>
                                                    );
                                                  }
                                                })()}
                                              </div>
                                            ) : (
                                              <p className="whitespace-pre-wrap">{msg.content}</p>
                                            )}
                                           <div className={`text-[9px] mt-1 flex justify-end font-medium opacity-70 gap-1.5 items-center`}>
                                              {(msg.is_edited === 1 || msg.is_edited === true) && (
                                                <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">(edited)</span>
                                              )}
                                              <span>{dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}</span>
                                              {isMe && <span>✓✓</span>}
                                           </div>
                                       </div>

                                       {/* Action buttons float */}
                                       <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>
                                           <button onClick={() => handleCopyMessage(msg.content)} className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-400 hover:text-blue-500 rounded-lg shadow-sm" title="Copy">
                                              <FiCopy size={12}/>
                                           </button>
                                           {isMe && (
                                              <button onClick={() => startEditing(msg)} className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-400 hover:text-indigo-500 rounded-lg shadow-sm" title="Edit">
                                                 <FiEdit2 size={12}/>
                                              </button>
                                           )}
                                           <button onClick={() => handleForwardMessage(msg.content)} className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-400 hover:text-emerald-500 rounded-lg shadow-sm" title="Forward">
                                              <FiCornerUpRight size={12}/>
                                           </button>
                                           {(isMe || user?.role === 'admin') && (
                                              <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-400 hover:text-red-500 rounded-lg shadow-sm" title="Delete">
                                                 <FiTrash2 size={12}/>
                                              </button>
                                           )}
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
                {uploading && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Uploading file...
                  </div>
                )}
                {editingMessage && (
                  <div className="flex items-center justify-between px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 rounded-xl text-xs mb-2 text-indigo-700 dark:text-indigo-300 animate-slide-up shadow-sm">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse flex-shrink-0"></span>
                      <span className="font-bold uppercase tracking-wider text-[9px] bg-indigo-100 dark:bg-indigo-900 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400">Editing</span>
                      <span className="truncate opacity-90">"{editingMessage.content}"</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={cancelEditing} 
                      className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex-shrink-0"
                      title="Cancel edit"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="bg-white dark:bg-[#1A1C23] rounded-2xl shadow-xl p-1.5 flex items-center gap-1 border border-gray-100 dark:border-white/10 transition-shadow focus-within:shadow-2xl">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors rounded-xl flex items-center justify-center">
                       {uploading ? (
                         <div className="w-[18px] h-[18px] border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                       ) : (
                         <FiPaperclip size={18}/>
                       )}
                    </button>
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
           <div className="flex-1 overflow-y-auto px-8 py-6 space-y-3 custom-scrollbar pb-36">
             {subtasks.length === 0 && <p className="text-center text-gray-400 text-xs mt-10">No subtasks yet. Add one below.</p>}
             {subtasks.map((sub: any, i: number) => {
               const isDone = sub.is_completed === 1 || sub.is_completed === true;
               return (
                 <div key={sub.id || i} className="flex items-center gap-3 p-3 bg-white dark:bg-[#12141D] rounded-xl border border-gray-100 dark:border-white/5 group relative hover:shadow-md transition-shadow">
                   <button onClick={() => toggleSubtask(sub)} className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                     isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-white/20 hover:border-emerald-400'
                   }`}>{isDone && <FiCheckCircle size={11}/>}</button>
                   <span className={`text-[12px] font-bold flex-1 ${isDone ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>{sub.title}</span>
                   
                   {/* Assignee Badge */}
                   <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 px-2 py-0.5 rounded-lg">
                       <FiUser size={10} />
                       <span>{sub.assigned_to_name || 'Unassigned'}</span>
                   </div>

                   {/* Delete action */}
                   {['admin', 'team_lead', 'crm_head', 'marketing_head', 'bdm'].includes(user?.role || '') && (
                     <button onClick={() => handleDeleteSubtask(sub.id)} className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <FiTrash2 size={13}/>
                     </button>
                   )}
                 </div>
               );
             })}
             <div className="absolute bottom-5 inset-x-6 z-[100] flex flex-col gap-2">
               <form onSubmit={handleAddSubtask} className="bg-white dark:bg-[#12141D] rounded-[18px] border border-gray-200 dark:border-white/10 shadow-2xl p-1.5 flex items-center gap-1.5 focus-within:border-indigo-500 transition-colors">
                 <input 
                   value={newSubtask} 
                   onChange={e => setNewSubtask(e.target.value)} 
                   placeholder="Add a subtask..." 
                   className="flex-1 py-3 px-3 bg-transparent outline-none text-[12px] font-medium text-gray-700 dark:text-gray-200 placeholder:text-gray-400" 
                 />
                 
                 {/* Compact Assignee Selector */}
                 <select 
                   value={subtaskAssignee} 
                   onChange={e => setSubtaskAssignee(e.target.value)}
                   className="py-1 px-2 text-[10px] font-bold text-gray-500 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl outline-none cursor-pointer max-w-[100px] dark:text-gray-300"
                 >
                   <option value="">Assign...</option>
                   {allUsers.map((u: any) => (
                     <option key={u.id} value={u.id}>{u.name}</option>
                   ))}
                 </select>

                 <button type="submit" disabled={!newSubtask.trim()} className="p-2.5 bg-indigo-600 disabled:bg-indigo-600/30 text-white rounded-xl shadow-xl shadow-indigo-500/20 hover:scale-110 active:scale-95 transition-all"><FiSend size={16}/></button>
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

      {/* PIPELINE WIZARD MODAL */}
      {showPipeline && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all duration-300">
          <div className="w-full max-w-4xl bg-white dark:bg-[#0C0E17]/95 border border-gray-200 dark:border-white/10 rounded-[24px] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 text-left">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01]">
              <div>
                <h3 className="text-[16px] font-black text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
                  <span>🌐</span> Project Execution Pipeline
                </h3>
                <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-0.5">
                  Track development lifecycle phases, timelines, and assign responsible owners.
                </p>
              </div>
              <button 
                onClick={() => setShowPipeline(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-all"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar">
              {/* Progress Gauge */}
              <div className="bg-gray-50 dark:bg-white/[0.02] p-5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-gray-500 dark:text-gray-400 font-bold">Pipeline Completion State</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">
                    {(() => {
                      const completedCount = pipelineStages.filter((s: any) => s.status === 'completed').length;
                      const progressPercent = Math.round((pipelineStages.reduce((acc, s) => acc + (s.status === 'completed' ? 1 : s.status === 'in_progress' ? 0.5 : 0), 0) / 5) * 100);
                      return `${progressPercent}% Completed`;
                    })()}
                  </span>
                </div>
                <div className="w-full h-3.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden relative shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                    style={{ 
                      width: `${Math.round((pipelineStages.reduce((acc, s) => acc + (s.status === 'completed' ? 1 : s.status === 'in_progress' ? 0.5 : 0), 0) / 5) * 100)}%` 
                    }}
                  />
                </div>
              </div>

              {/* Horizontal Pipeline Steps */}
              <div className="relative flex items-center justify-between px-4 py-6">
                {/* Horizontal connection line */}
                <div className="absolute top-[52px] left-8 right-8 h-1 bg-gray-200 dark:bg-white/5 z-0" />
                
                {/* Color-coded active/completed line overlays */}
                <div 
                  className="absolute top-[52px] left-8 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500 z-0 transition-all duration-1000"
                  style={{
                    width: `${(() => {
                      const completedCount = pipelineStages.filter((s: any) => s.status === 'completed').length;
                      const inProgressCount = pipelineStages.filter((s: any) => s.status === 'in_progress').length;
                      if (completedCount === 5) return '88%';
                      if (completedCount === 0 && inProgressCount === 0) return '0%';
                      const pct = Math.min(88, completedCount * 22 + (inProgressCount ? 11 : 0));
                      return `${pct}%`;
                    })()}`
                  }}
                />

                {[
                  { name: 'planning', label: 'Planning', desc: 'Scope & Alignment', icon: FiLayout, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' },
                  { name: 'design', label: 'Design', desc: 'Wireframes & UI', icon: FiAward, color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10' },
                  { name: 'development', label: 'Development', desc: 'Coding & Features', icon: FiActivity, color: 'text-pink-500 bg-pink-50 dark:bg-pink-500/10' },
                  { name: 'testing', label: 'Testing', desc: 'QA & Debugging', icon: FiClock, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' },
                  { name: 'client_verification', label: 'Client Signoff', desc: 'Review & Approvals', icon: FiCheckCircle, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
                ].map((step, i) => {
                  const dbStage = pipelineStages.find((s: any) => s.stage_name === step.name) || { status: 'pending' };
                  const isCompleted = dbStage.status === 'completed';
                  const isInProgress = dbStage.status === 'in_progress';
                  const isSelected = selectedStage?.stage_name === step.name;
                  const Icon = step.icon;

                  return (
                    <button 
                      key={step.name}
                      onClick={() => {
                        const matched = pipelineStages.find((s: any) => s.stage_name === step.name);
                        setSelectedStage(matched || { stage_name: step.name, status: 'pending' });
                      }}
                      className="group relative flex flex-col items-center text-center z-10 focus:outline-none transition-transform hover:scale-105 active:scale-95 duration-200"
                    >
                      {/* Bubble */}
                      <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'border-indigo-600 dark:border-indigo-400 scale-110 shadow-lg shadow-indigo-500/20' 
                          : 'border-white dark:border-[#0C0E17]'
                      } ${
                        isCompleted 
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                          : isInProgress 
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 animate-pulse' 
                          : 'bg-gray-100 dark:bg-[#1C1F2E] text-gray-400 dark:text-gray-500 border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10'
                      }`}>
                        <Icon size={20} />
                      </div>

                      {/* Bubble label */}
                      <span className={`text-[11px] font-black mt-3 transition-colors ${
                        isSelected 
                          ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' 
                          : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'
                      }`}>
                        {step.label}
                      </span>

                      {/* Status indicator bubble */}
                      <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-full mt-1 ${
                        isCompleted 
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                          : isInProgress 
                          ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 animate-pulse' 
                          : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'
                      }`}>
                        {dbStage.status.replace('_', ' ')}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Stage Detail Editor */}
              {selectedStage && (
                <div className="bg-gray-50 dark:bg-white/[0.01] rounded-2xl border border-gray-100 dark:border-white/5 p-6 space-y-6">
                  {/* Selected title & lock banner */}
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Active Selector</span>
                      <h4 className="text-[14px] font-black text-gray-900 dark:text-gray-100 mt-0.5">
                        Configure Phase: {selectedStage.stage_name.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </h4>
                    </div>

                    {!['admin', 'team_lead', 'crm_head', 'marketing_head', 'bdm'].includes(user?.role || '') ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                        🔒 Read-only View
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                        ✍️ Edit Permissions Granted
                      </span>
                    )}
                  </div>

                  {/* Form fields grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-[#12141D] p-5 rounded-xl border border-gray-100 dark:border-white/5">
                    {/* Left Col */}
                    <div className="space-y-4">
                      {/* Status select */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-wide">Execution Status</label>
                        <select 
                          disabled={!['admin', 'team_lead', 'crm_head', 'marketing_head', 'bdm'].includes(user?.role || '')}
                          value={editStatus}
                          onChange={e => setEditStatus(e.target.value)}
                          className="w-full p-2.5 text-[12px] font-bold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors dark:text-white dark:bg-[#1C1F2E]"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>

                      {/* Responsible Person select */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-wide">Responsible Owner</label>
                        <select 
                          disabled={!['admin', 'team_lead', 'crm_head', 'marketing_head', 'bdm'].includes(user?.role || '')}
                          value={editResponsible}
                          onChange={e => setEditResponsible(e.target.value)}
                          className="w-full p-2.5 text-[12px] font-bold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors dark:text-white dark:bg-[#1C1F2E]"
                        >
                          <option value="">Select Responsible Owner...</option>
                          {allUsers.map((u: any) => (
                            <option key={u.id} value={String(u.id)}>{u.name} ({u.role.replace('_', ' ')})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Right Col */}
                    <div className="space-y-4">
                      {/* Start Date */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-wide">Start Date</label>
                        <input 
                          type="date"
                          disabled={!['admin', 'team_lead', 'crm_head', 'marketing_head', 'bdm'].includes(user?.role || '')}
                          value={editStartDate}
                          onChange={e => setEditStartDate(e.target.value)}
                          className="w-full p-2.5 text-[12px] font-bold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors dark:text-white dark:bg-[#1C1F2E]"
                        />
                      </div>

                      {/* End Date */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-wide">End Date / Timeline</label>
                        <input 
                          type="date"
                          disabled={!['admin', 'team_lead', 'crm_head', 'marketing_head', 'bdm'].includes(user?.role || '')}
                          value={editEndDate}
                          onChange={e => setEditEndDate(e.target.value)}
                          className="w-full p-2.5 text-[12px] font-bold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors dark:text-white dark:bg-[#1C1F2E]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions for Leads */}
                  {['admin', 'team_lead', 'crm_head', 'marketing_head', 'bdm'].includes(user?.role || '') && (
                    <div className="flex justify-end pt-2">
                      <button 
                        disabled={isSavingStage}
                        onClick={handleUpdateStage}
                        className="px-6 py-2.5 text-[12px] font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
                      >
                        {isSavingStage ? 'Saving State...' : 'Save Stage Parameters'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        {/* Jitsi Meeting Overlay */}
        {showVideoCall && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex flex-col p-4 md:p-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gray-900/50 backdrop-blur-sm rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-white">
                    🎥 Live Meeting
                  </h2>
                  <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5 tracking-wide">
                    Task: {task?.title}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  if (confirm("Are you sure you want to end this call?")) {
                    closeVideoCall();
                  }
                }} 
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-[0.98] shadow-lg shadow-red-500/20"
              >
                End Call
              </button>
            </div>

            {/* Jitsi Meeting Frame */}
            <div className="flex-1 bg-black rounded-b-2xl overflow-hidden relative border border-white/10 shadow-2xl mt-1">
              <div ref={jitsiContainerRef} className="w-full h-full" />
            </div>
          </div>
        )}
     </div>
   );
}

function FiMessageSquare({ size }: { size?: number }) { return (<svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height={size} width={size}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>); }
