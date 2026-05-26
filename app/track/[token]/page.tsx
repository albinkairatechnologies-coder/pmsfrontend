'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { 
  FiClock, FiCheckCircle, FiAlertCircle, FiUser, 
  FiCalendar, FiActivity, FiBriefcase, FiArrowLeft, FiList, 
  FiMessageSquare, FiSend, FiPaperclip, FiDownload, FiFile, FiImage, FiLock, FiX,
  FiVideo
} from 'react-icons/fi';
import GlowCard from '../../components/GlowCard';
import { API_URL } from '../../utils/api';

const STAGES = ['planning', 'design', 'development', 'testing', 'delivery', 'completed'];

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

const formatTimeAgo = (isoString: string) => {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch (e) {
    return '';
  }
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

// Secure client image component that fetches with client_token to display chat images without JWT
function SecureClientImage({ token, filename, alt }: { token: string; filename: string; alt: string }) {
  const [src, setSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchImage = async () => {
      try {
        const res = await fetch(`${API_URL}/public/clients/track/${token}/attachments/${filename}`);
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
  }, [filename, token]);

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

// Helper to parse naive datetime strings (which are stored in IST timezone on the backend)
// so they display accurately in the client's local browser timezone.
const parseISTDate = (dateStr: string | Date | null | undefined): Date => {
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

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Not set';
  try {
    return parseISTDate(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
};

const getActiveOrFirstStage = (task: any) => {
  if (!task || !task.pipeline_stages || task.pipeline_stages.length === 0) return 'planning';
  const inProgress = task.pipeline_stages.find((s: any) => s.status === 'in_progress');
  if (inProgress) {
    if (inProgress.stage_name === 'client_verification') {
      return inProgress.status === 'completed' ? 'completed' : 'delivery';
    }
    return inProgress.stage_name;
  }
  return 'planning';
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

export default function TrackPage() {
  const params = useParams();
  const token = params?.token as string;

  const [client, setClient] = useState<any>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedStageName, setSelectedStageName] = useState<string | null>(null);
  const [autoCycle, setAutoCycle] = useState(false);
  const [autoOpenNew, setAutoOpenNew] = useState(true);
  const [cycleTimer, setCycleTimer] = useState(6);
  const [newTaskAlert, setNewTaskAlert] = useState<string | null>(null);

  const selectedTaskIdRef = useRef<number | null>(null);
  const autoOpenNewRef = useRef(true);
  const prevMaxTaskIdRef = useRef<number | null>(null);

  // Video Call Integration States & Refs
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const [showVideoCall, setShowVideoCall] = useState(false);

  useEffect(() => {
    selectedTaskIdRef.current = selectedTaskId;
  }, [selectedTaskId]);

  useEffect(() => {
    autoOpenNewRef.current = autoOpenNew;
  }, [autoOpenNew]);

  const displayedStageName = selectedStageName || getActiveOrFirstStage(activeTask);
  
  const [loading, setLoading] = useState(true);
  const [taskLoading, setTaskLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll for message updates
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const showNewTaskToast = (title: string) => {
    setNewTaskAlert(title);
    setTimeout(() => setNewTaskAlert(null), 5000);
  };

  const fetchClientDetails = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/public/clients/track/${token}`);
      setClient(res.data);
      setError(null);

      if (res.data.tasks && res.data.tasks.length > 0) {
        const sortedTasks = [...res.data.tasks].sort((a: any, b: any) => b.id - a.id);
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
          showNewTaskToast(sortedTasks[0].title);
        }

        prevMaxTaskIdRef.current = latestTaskId;
      }
    } catch (err: any) {
      console.error('Error fetching tracking client details:', err);
      setError(err.response?.data?.error || 'Tracking profile not found or magic link is invalid.');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveTaskDetails = async (taskId: number) => {
    if (!token || !taskId) return;
    try {
      setTaskLoading(true);
      const res = await axios.get(`${API_URL}/public/clients/track/${token}/tasks/${taskId}`);
      setActiveTask(res.data);
    } catch (err) {
      console.error('Error fetching task details:', err);
    } finally {
      setTaskLoading(false);
    }
  };

  const fetchMessages = async (taskId: number) => {
    if (!token || !taskId) return;
    try {
      const res = await axios.get(`${API_URL}/public/clients/track/${token}/tasks/${taskId}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error('Error loading task messages:', err);
    }
  };

  // Initial Load & Client Polling (includes task list check)
  useEffect(() => {
    fetchClientDetails();
    const interval = setInterval(fetchClientDetails, 6000);
    return () => clearInterval(interval);
  }, [token]);

  // Auto-Cycle Switch with second-level countdown visualizer
  useEffect(() => {
    if (!autoCycle || !client?.tasks || client.tasks.length <= 1) {
      setCycleTimer(6);
      return;
    }
    
    const interval = setInterval(() => {
      setCycleTimer(prev => {
        if (prev <= 1) {
          setSelectedTaskId(prevId => {
            const tasks = client.tasks;
            const currentIndex = tasks.findIndex((t: any) => t.id === prevId);
            if (currentIndex === -1) return tasks[0].id;
            const nextIndex = (currentIndex + 1) % tasks.length;
            return tasks[nextIndex].id;
          });
          return 6;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [autoCycle, client?.tasks]);

  // Load selected task details and chat messages
  useEffect(() => {
    if (selectedTaskId) {
      setSelectedStageName(null);
      fetchActiveTaskDetails(selectedTaskId);
      fetchMessages(selectedTaskId);

      // Poll messages and task details
      const msgInterval = setInterval(() => {
        fetchMessages(selectedTaskId);
        // Silently reload task details for pipeline tracking
        axios.get(`${API_URL}/public/clients/track/${token}/tasks/${selectedTaskId}`)
          .then(res => setActiveTask(res.data))
          .catch(() => {});
      }, 6000);

      return () => clearInterval(msgInterval);
    }
  }, [selectedTaskId, token]);

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
    const roomName = `KairaFlow_Task_${selectedTaskId}_MeetingRoom`;
    const options = {
      roomName: roomName,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: client?.contact_person || 'Client'
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

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedTaskId) return;
    try {
      const msgToSend = newMessage;
      setNewMessage('');
      await axios.post(`${API_URL}/public/clients/track/${token}/tasks/${selectedTaskId}/messages`, {
        content: msgToSend,
        message_type: 'text'
      });
      fetchMessages(selectedTaskId);
    } catch (err) {
      console.error('Failed to send message', err);
      alert('Failed to send message. Make sure your account is linked correctly.');
    }
  };

  const handleDownload = async (filename: string, originalName: string) => {
    try {
      const res = await fetch(`${API_URL}/public/clients/track/${token}/attachments/${filename}`);
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
    if (!file || !selectedTaskId) return;

    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert('File too large! Maximum attachment size is capped at 20MB.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await axios.post(
        `${API_URL}/public/clients/track/${token}/tasks/${selectedTaskId}/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      const { file_url, file_name, file_type } = uploadRes.data;

      await axios.post(`${API_URL}/public/clients/track/${token}/tasks/${selectedTaskId}/messages`, {
        content: file_name,
        message_type: 'file',
        file_url: file_url
      });

      fetchMessages(selectedTaskId);
    } catch (err) {
      console.error('Failed to upload file', err);
      alert('File upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#08090D] flex flex-col items-center justify-center p-6 transition-colors">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-200/20 animate-pulse"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-xs font-black uppercase tracking-widest animate-pulse">
          Securing Premium Workspace...
        </p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#08090D] flex items-center justify-center p-6 transition-colors">
        <GlowCard className="p-8 max-w-md w-full text-center bg-white dark:bg-surface-dark border border-red-500/20 shadow-2xl rounded-3xl" goldBorder={false}>
          <div className="w-16 h-16 bg-rose-500/10 dark:bg-rose-500/5 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
            <FiAlertCircle size={32} className="stroke-[2.5]" />
          </div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Access Denied</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
            {error || 'This secure magic link is invalid, expired, or does not exist. Please request a new link from your Project Manager.'}
          </p>
          <div className="h-px bg-gray-100 dark:bg-white/5 my-4"></div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold">KairaFlow Secure Bridge</p>
        </GlowCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#08090D] text-gray-900 dark:text-white flex flex-col overflow-hidden font-sans transition-colors">
      
      {/* Premium Header */}
      <header className="px-6 py-4 bg-white/70 dark:bg-[#0F111A]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5 flex items-center justify-between z-10 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[8px] uppercase tracking-widest font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Live Secure Channel
            </span>
          </div>
          <h1 className="text-xl font-black uppercase tracking-tight text-indigo-600 dark:text-indigo-400">
            {client.company_name} Workspace
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {selectedTaskId && (
            <button
              onClick={() => setShowVideoCall(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#8e44ad] hover:bg-[#732d91] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-[0.98] shadow-md shadow-purple-500/10 mr-1"
            >
              <FiVideo size={14} className="stroke-[2.5]" />
              <span>Join Call</span>
            </button>
          )}
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl">
            <FiBriefcase className="text-indigo-500" size={16} />
            <div className="text-left hidden sm:block">
              <p className="text-[8px] uppercase tracking-wider text-gray-400 font-extrabold">Active Client</p>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                {client.contact_person}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left Column: Client Tasks Switcher */}
        <aside className="w-full md:w-80 bg-white/40 dark:bg-[#0A0B12]/40 border-r border-gray-100 dark:border-white/5 p-4 flex flex-col overflow-y-auto flex-shrink-0 gap-3 md:max-h-full">
          
          <div className="flex flex-col gap-2.5 mb-2 bg-white/60 dark:bg-[#0F111A]/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] uppercase font-black tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                <FiList size={12} className="text-indigo-500" />
                <span>Assigned Projects ({client.tasks?.length || 0})</span>
              </h2>
            </div>
            
            <div className="flex items-center gap-2 mt-1.5 border-t border-gray-100 dark:border-white/5 pt-2.5 justify-between">
              {/* Auto Open Switch */}
              <button 
                type="button"
                onClick={() => setAutoOpenNew(!autoOpenNew)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[8.5px] font-black uppercase tracking-wider border transition-all duration-300 ${
                  autoOpenNew 
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)] hover:bg-emerald-500/20' 
                    : 'bg-slate-100 dark:bg-white/5 text-gray-400 border-transparent hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
                title="When the admin uploads a new project, automatically select and view it"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${autoOpenNew ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`}></span>
                <span>Auto-Open New</span>
              </button>

              {/* Auto Cycle Toggle */}
              {client.tasks && client.tasks.length > 1 && (
                <button 
                  type="button"
                  onClick={() => {
                    setAutoCycle(!autoCycle);
                    if (!autoCycle) {
                      setAutoOpenNew(false); // disable auto-open if cycling to prevent jumps
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[8.5px] font-black uppercase tracking-wider border transition-all duration-300 ${
                    autoCycle 
                      ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/25 shadow-[0_0_8px_rgba(99,102,241,0.15)]' 
                      : 'bg-slate-100 dark:bg-white/5 text-gray-400 border-transparent hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                  title="Automatically cycle through projects every few seconds"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${autoCycle ? 'bg-indigo-400 animate-ping' : 'bg-gray-400'}`}></span>
                  <span>Auto-Cycle</span>
                </button>
              )}
            </div>
            
            {/* Auto Cycle countdown timer visualizer */}
            {autoCycle && (
              <div className="w-full h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden p-[1px] relative mt-1.5">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                  style={{ width: `${(cycleTimer / 6) * 100}%` }}
                />
              </div>
            )}
          </div>
          
          <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-thin">
            {client.tasks && client.tasks.length > 0 ? (
              client.tasks.map((t: any) => {
                const isSelected = selectedTaskId === t.id;
                
                // Set colorful background theme depending on stage & selected state
                let cardStyles = '';
                if (isSelected) {
                  cardStyles = 'bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 text-white border-transparent shadow-[0_8px_20px_rgba(99,102,241,0.3)] scale-[1.02]';
                } else {
                  cardStyles = 'bg-white/70 dark:bg-[#0E0F17]/40 border-gray-100 dark:border-white/5 hover:border-indigo-500/30 hover:bg-indigo-50/15 dark:hover:bg-indigo-950/20 shadow-sm hover:scale-[1.01]';
                }

                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className={`flex-shrink-0 w-64 md:w-full text-left p-4 rounded-2xl border transition-all duration-300 relative group overflow-hidden ${cardStyles}`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-white"></div>
                    )}
                    <h3 className={`text-sm font-bold line-clamp-1 transition-colors ${
                      isSelected ? 'text-white' : 'text-gray-800 dark:text-gray-100 group-hover:text-indigo-500'
                    }`}>
                      {t.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                        t.status === 'completed' ? 'bg-emerald-400' :
                        t.status === 'in_progress' ? 'bg-blue-400' : 'bg-amber-400'
                      } ${isSelected ? 'animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]' : ''}`}></span>
                      <span className={`text-[9px] uppercase tracking-wider font-extrabold ${
                        isSelected ? 'text-indigo-100' : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center text-xs text-gray-400 italic py-8 w-full">
                No active tasks listed yet.
              </div>
            )}
          </div>
        </aside>

        {/* Center Panel & Right Chat Split */}
        {selectedTaskId && activeTask ? (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-h-full">
            
            {/* Center Area: Task Stepper & Info */}
            <main className="flex-1 p-6 overflow-y-auto space-y-6 lg:max-h-full scrollbar-thin">
              {taskLoading ? (
                <div className="flex items-center justify-center h-48 animate-pulse text-indigo-500 font-bold text-xs uppercase tracking-widest">
                  Loading project status...
                </div>
              ) : (
                <>
                  {/* Overall Project Progress Status Bar */}
                  {(() => {
                    const progress = getOverallProgress(activeTask);
                    return (
                      <div className="w-full bg-white/80 dark:bg-[#11131E]/60 border border-indigo-500/20 dark:border-indigo-500/10 p-5 rounded-3xl shadow-[0_8px_30px_rgba(99,102,241,0.06)] relative overflow-hidden backdrop-blur-md">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/2 to-pink-500/5 opacity-70"></div>
                        <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500"></div>
                        <div className="relative z-10 pl-2">
                          <div className="flex justify-between items-center mb-2.5">
                            <div>
                              <p className="text-[9px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                <span>Overall Project Progress</span>
                              </p>
                              <h3 className="text-sm font-black text-gray-900 dark:text-white mt-1 flex items-center gap-1.5 uppercase tracking-tight">
                                <span>🚀</span> Status: {progress === 100 ? 'Completed 🎉' : activeTask.status.replace(/_/g, ' ')}
                              </h3>
                            </div>
                            <span className="text-[10px] font-black text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-md shadow-indigo-500/30 px-3 py-1.5 rounded-full">
                              {progress}% Complete
                            </span>
                          </div>
                          
                          {/* Progress Bar Track */}
                          <div className="w-full h-3.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden relative border border-gray-200/40 dark:border-white/5 p-[2px]">
                            {/* Inner glowing progress line */}
                            <div 
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_12px_rgba(168,85,247,0.5)] transition-all duration-1000 ease-out relative"
                              style={{ width: `${progress}%` }}
                            >
                              {/* Animated light flare */}
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
                    );
                  })()}

                  {/* Task Metadata Card */}
                  <GlowCard className="p-6 bg-white dark:bg-[#11131E]/60 border border-gray-100 dark:border-white/5 rounded-3xl shadow-sm" goldBorder={activeTask.status !== 'completed'}>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                      <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                          {activeTask.title}
                        </h2>
                        <p className="text-[9px] uppercase tracking-widest font-black text-indigo-500 mt-1">
                          Phase: {activeTask.status.replace('_', ' ')}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border ${
                          activeTask.priority === 'high' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-transparent' :
                          'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-transparent'
                        }`}>
                          {activeTask.priority} Priority
                        </span>
                      </div>
                    </div>

                    {activeTask.description && (
                      <div className="mt-4">
                        <p className="text-[8px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-extrabold mb-1">Description</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-slate-50 dark:bg-white/[0.01] border border-gray-100 dark:border-white/5 p-4 rounded-xl">
                          {activeTask.description}
                        </p>
                      </div>
                    )}

                    {/* Stepper Pipeline */}
                    <div className="mt-6 border-t border-gray-100 dark:border-white/5 pt-5">
                      <h3 className="text-[9px] uppercase font-black text-gray-400 dark:text-gray-500 tracking-wider mb-4">Execution Stages Progress</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
                        {STAGES.map((stage) => {
                          const status = getStageStatusForTask(activeTask, stage);
                          const isCompleted = status === 'completed';
                          const isInProgress = status === 'in_progress';
                          const isSelected = displayedStageName === stage;

                          return (
                            <button
                              type="button"
                              key={stage}
                              onClick={() => setSelectedStageName(stage)}
                              className={`p-3 rounded-xl border text-center transition-all duration-300 relative overflow-hidden focus:outline-none ${
                                isCompleted
                                  ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/10 shadow-md'
                                  : isInProgress
                                  ? 'bg-amber-500 border-amber-600 text-white shadow-amber-500/20 shadow-md animate-pulse scale-[1.02] z-10'
                                  : 'bg-slate-50 dark:bg-white/[0.01] border-gray-100 dark:border-white/5 text-gray-400 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-white/5'
                              } ${
                                isSelected
                                  ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 scale-[1.03] z-20 shadow-md shadow-indigo-500/20'
                                  : ''
                              }`}
                            >
                              <div className="text-[8px] uppercase font-black tracking-widest truncate">
                                {stage}
                              </div>
                              <div className="text-[7px] mt-1 font-bold uppercase opacity-85 flex items-center justify-center gap-0.5">
                                {isCompleted ? (
                                  <>
                                    <FiCheckCircle size={8} />
                                    <span>Completed</span>
                                  </>
                                ) : isInProgress ? (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-white animate-ping"></span>
                                    <span>Active</span>
                                  </>
                                ) : (
                                  <span>Pending</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Phase Details Card */}
                    {(() => {
                      const dbStageName = displayedStageName === 'delivery' || displayedStageName === 'completed' ? 'client_verification' : displayedStageName;
                      const stageObj = activeTask.pipeline_stages?.find((s: any) => s.stage_name === dbStageName) || null;
                      const stageStatus = getStageStatusForTask(activeTask, displayedStageName);

                      return (
                        <div className="mt-4 p-5 rounded-2xl border bg-slate-50/50 dark:bg-white/[0.02] border-gray-100 dark:border-white/5 relative overflow-hidden transition-all">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-gray-100 dark:border-white/5">
                            <div>
                              <p className="text-[8px] uppercase tracking-widest text-gray-400 font-extrabold">Inspecting Phase</p>
                              <h4 className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mt-0.5">
                                <span>⚡</span> {displayedStageName}
                              </h4>
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                              stageStatus === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                              stageStatus === 'in_progress' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' :
                              'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 border-transparent'
                            }`}>
                              {stageStatus === 'completed' ? 'Completed' :
                               stageStatus === 'in_progress' ? 'Active / In Progress' :
                               'Pending'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                            <div>
                              <p className="text-[8px] uppercase tracking-wider text-gray-400 font-extrabold mb-1">Start Date</p>
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                                {stageObj?.start_date ? formatDate(stageObj.start_date) : 'Not started yet'}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-[8px] uppercase tracking-wider text-gray-400 font-extrabold mb-1">Estimated Delivery</p>
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                                {stageObj?.end_date ? formatDate(stageObj.end_date) : 'Flexible Timeline'}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-[8px] uppercase tracking-wider text-gray-400 font-extrabold mb-1">Responsible Owner</p>
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1">
                                <span className="w-4 h-4 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-[8px] font-bold">
                                  {stageObj?.responsible_person_name ? stageObj.responsible_person_name[0].toUpperCase() : 'A'}
                                </span>
                                {stageObj?.responsible_person_name || 'Assigned Lead'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </GlowCard>

                  {/* Metadata Row cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Estimated Deadline Card */}
                    <div className="p-4 bg-white/60 dark:bg-[#11131E]/60 backdrop-blur-md border border-amber-500/30 dark:border-amber-500/20 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-[0_8px_25px_rgba(245,158,11,0.15)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                        <FiCalendar size={20} />
                      </div>
                      <div className="relative z-10">
                        <p className="text-[8px] uppercase tracking-[0.1em] text-amber-600 dark:text-amber-400 font-extrabold">Estimated Deadline</p>
                        <p className="text-xs font-extrabold text-gray-800 dark:text-gray-100 mt-1">
                          {activeTask.due_date ? new Date(activeTask.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Flexible'}
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
                          {activeTask.assigned_by_name || 'System Lead'}
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
                          {activeTask.assigned_name || 'Allocating Team'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Activity updates log */}
                  <div className="p-6 bg-white dark:bg-[#11131E]/30 border border-gray-100 dark:border-white/5 rounded-3xl shadow-sm">
                    <h3 className="text-[10px] uppercase font-black text-gray-400 dark:text-gray-500 tracking-wider mb-5 flex items-center gap-1.5">
                      <FiActivity className="text-indigo-500" />
                      <span>Project Update Logs</span>
                    </h3>
                    
                    <div className="relative border-l border-gray-200 dark:border-white/10 pl-6 ml-3 space-y-5">
                      {activeTask.activity && activeTask.activity.length > 0 ? (
                        activeTask.activity.map((log: any, idx: number) => (
                          <div key={idx} className="relative group">
                            <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-[#08090D] bg-indigo-500 shadow-sm z-10"></div>
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-200">
                                  {log.action.replace(/_/g, ' ')}
                                </span>
                                <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                  {formatTimeAgo(log.created_at)}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{log.new_value}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-400 italic py-4 text-xs">
                          No project update logs recorded.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </main>

            {/* Right Chat Column: Task Chat Widget */}
            <section className="w-full lg:w-96 bg-white/70 dark:bg-[#0B0C15]/80 border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-white/5 flex flex-col overflow-hidden max-h-[500px] lg:max-h-full lg:h-full flex-shrink-0 relative">
              
              {/* Chat Header */}
              <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 flex items-center gap-2 flex-shrink-0 bg-white/80 dark:bg-[#0F111A]/80">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <FiMessageSquare size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-white">
                    Project Chat Space
                  </h3>
                  <p className="text-[8px] text-gray-400 font-extrabold uppercase tracking-widest">
                    Direct Developer Bridge
                  </p>
                </div>
              </div>

              {/* Chat Message Scroll */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin pb-20">
                {messages.length > 0 ? (
                  (() => {
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

                      // Check if message belongs to client
                      const isClientMsg = msg.user_role === 'client';
                      const isSystem = msg.message_type === 'system';

                      return (
                        <div key={i}>
                          {showDateSeparator && (
                            <div className="flex justify-center my-4">
                              <div className="px-3 py-1 bg-black/10 dark:bg-white/5 backdrop-blur-md rounded-full text-[9px] font-bold text-gray-500 dark:text-gray-400 border border-white/5">
                                {formattedDate}
                              </div>
                            </div>
                          )}

                          {isSystem ? (
                            <div className="flex justify-start my-1 animate-slide-up">
                              <div className="relative px-3 py-2 bg-white/10 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl w-full shadow-sm text-[11px] flex flex-col items-start overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500/50"></div>
                                <div className="flex items-center justify-between w-full">
                                  <p className="text-gray-500 dark:text-gray-400">
                                    <span className="font-bold underline text-blue-500 mr-1">{msg.user_name}</span> 
                                    {msg.content}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className={`flex items-start gap-2.5 mb-2 ${isClientMsg ? 'flex-row-reverse' : ''}`}>
                              {/* Avatar */}
                              <div className={`w-7 h-7 rounded-full ${isClientMsg ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'} flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white border border-white dark:border-white/5 shadow-sm`}>
                                {msg.user_name ? msg.user_name[0].toUpperCase() : 'U'}
                              </div>
                              <div className={`max-w-[75%] flex flex-col ${isClientMsg ? 'items-end' : 'items-start'}`}>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 font-extrabold px-1 mb-0.5">{msg.user_name}</div>
                                <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                                  isClientMsg 
                                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                                    : 'bg-white dark:bg-[#191A23] text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-white/5 rounded-tl-none'
                                }`}>
                                  {msg.file_url ? (
                                    <div className="flex flex-col gap-2">
                                      {(() => {
                                        const fileType = getFileTypeFromFilename(msg.file_url);
                                        if (fileType.startsWith('image/')) {
                                          return <SecureClientImage token={token} filename={msg.file_url} alt={msg.content || 'Image'} />;
                                        } else if (fileType === 'application/pdf') {
                                          return (
                                            <div className="flex items-center gap-3 p-2 bg-red-500/10 dark:bg-red-500/5 rounded-xl border border-red-500/20 text-red-700 dark:text-red-400 min-w-[180px]">
                                              <FiFile size={18} className="text-red-500 flex-shrink-0" />
                                              <div className="flex-1 min-w-0 text-left">
                                                <p className="text-xs font-bold truncate">{msg.content}</p>
                                                <p className="text-[8px] opacity-75 font-extrabold">PDF FILE</p>
                                              </div>
                                              <button 
                                                type="button"
                                                onClick={() => handleDownload(msg.file_url, msg.content)}
                                                className="p-1 hover:bg-red-500/20 dark:hover:bg-red-500/10 rounded transition-colors"
                                              >
                                                <FiDownload size={14} />
                                              </button>
                                            </div>
                                          );
                                        } else {
                                          return (
                                            <div className="flex items-center gap-3 p-2 bg-black/10 dark:bg-white/5 rounded-xl border border-white/10 min-w-[180px]">
                                              <FiFile size={16} className="flex-shrink-0" />
                                              <div className="flex-1 min-w-0 text-left">
                                                <p className="text-xs font-bold truncate">{msg.content}</p>
                                                <p className="text-[8px] opacity-60 font-extrabold">ATTACHMENT</p>
                                              </div>
                                              <button 
                                                type="button"
                                                onClick={() => handleDownload(msg.file_url, msg.content)}
                                                className="p-1 hover:bg-white/10 rounded transition-colors"
                                              >
                                                <FiDownload size={14} />
                                              </button>
                                            </div>
                                          );
                                        }
                                      })()}
                                    </div>
                                  ) : (
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                  )}
                                  <div className="text-[8px] mt-1 flex justify-end font-medium opacity-60">
                                    {dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()
                ) : (
                  <div className="text-center text-gray-400 italic py-12 text-xs">
                    No conversation history. Send a message to start!
                  </div>
                )}
                <div ref={chatEndRef}></div>
              </div>

              {/* Chat Composer Form */}
              <form onSubmit={handleSendMessage} className="absolute bottom-0 left-0 right-0 p-3 bg-white/90 dark:bg-[#0B0C15]/95 border-t border-gray-100 dark:border-white/5 flex gap-2 items-center z-20">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
                
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2 rounded-xl text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-white/5 transition-all flex-shrink-0 ${
                    uploading ? 'animate-pulse' : ''
                  }`}
                  title="Attach file (Max 20MB)"
                >
                  <FiPaperclip size={18} />
                </button>

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={uploading ? "Uploading attachment..." : "Ask your developer team..."}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 focus:outline-none focus:border-indigo-500 transition-colors text-gray-800 dark:text-gray-100"
                />

                <button
                  type="submit"
                  disabled={uploading || !newMessage.trim()}
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow transition-all flex-shrink-0 disabled:opacity-50 disabled:hover:bg-indigo-600"
                >
                  <FiSend size={16} />
                </button>
              </form>

            </section>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <FiLock className="text-gray-300 dark:text-gray-700 mb-4" size={48} />
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">No Project Active</h3>
            <p className="text-xs text-gray-400 max-w-xs mt-1">
              Select one of your assigned projects in the sidebar switcher to load pipeline progress and chat workspace.
            </p>
          </div>
        )}

      </div>

      {/* Jitsi Meeting Overlay */}
      {showVideoCall && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex flex-col p-4 md:p-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gray-900/50 backdrop-blur-sm rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                  🎥 Live Client Meeting
                </h2>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5 tracking-wide">
                  Task: {activeTask?.title}
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

      {/* Premium Toast for New Task Alert */}
      {newTaskAlert && (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full bg-white/90 dark:bg-[#0F111A]/95 backdrop-blur-lg border border-emerald-500/30 dark:border-emerald-500/20 shadow-[0_15px_40px_rgba(16,185,129,0.2)] rounded-2xl p-4 flex items-center gap-4 animate-slide-up transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20">
            <FiCheckCircle size={20} className="animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-500">
              New Project Created!
            </p>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate mt-0.5">
              {newTaskAlert}
            </h4>
            <p className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">
              Automatically focused & loaded latest work details.
            </p>
          </div>
          <button 
            type="button"
            onClick={() => setNewTaskAlert(null)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
          >
            <FiX size={16} />
          </button>
        </div>
      )}

    </div>
  );
}


