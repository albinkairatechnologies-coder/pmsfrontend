'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { announcementAPI } from '../../utils/api';
import { FiPlus, FiTrash2, FiEdit2, FiMessageCircle, FiSend, FiSmile, FiX, FiInfo, FiClock, FiUser, FiCheck, FiBell, FiMessageSquare, FiHeart, FiEye, FiMapPin, FiSearch, FiBarChart2 } from 'react-icons/fi';

const COMMON_EMOJIS = ['😊', '😂', '👍', '🔥', '❤️', '🙌', '🎉', '💻', '🚀', '✅', '✨', '📢', '💡', '💯', '🌟', '🙏', '👏', '🤝', '🎈', '❤️‍🔥'];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const canManage = ['admin', 'superadmin', 'marketing_head', 'crm_head', 'crm', 'team_lead', 'hr'].includes(user?.role || '');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', content: '' });
  
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, any[]>>({});
  const [newComment, setNewComment] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [pollForm, setPollForm] = useState({ question: '', options: ['', ''] });
  const [showPollEditor, setShowPollEditor] = useState(false);
  const [viewersModal, setViewersModal] = useState<{ list: any[] } | null>(null);
  const [hoveredViewers, setHoveredViewers] = useState<Record<number, any[]>>({});
  const [activeHoverId, setActiveHoverId] = useState<number | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await announcementAPI.getAll();
      const list = Array.isArray(res.data) ? res.data : [];
      setAnnouncements(list);
      // Record view for all announcements on page load
      list.forEach((ann: any) => {
        announcementAPI.recordView(ann.id).catch(() => {});
      });
    } catch (err) {
      console.error('Failed to load announcements', err);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (id: number) => {
    if (expandedId === id) {
       setExpandedId(null);
       return;
    }
    // Instantly reveal expansion slot for snappy UI feel
    setExpandedId(id);
    try {
      const res = await announcementAPI.getComments(id);
      setComments(prev => ({ ...prev, [id]: res.data }));
    } catch (err) {
      console.error('Failed to load comments', err);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, poll_data: showPollEditor ? pollForm : null };
      if (editingId) {
        await announcementAPI.update(editingId, payload);
        showToast('Announcement updated successfully!');
      } else {
        await announcementAPI.create(payload);
        showToast('Announcement posted & employees notified!');
      }
      setShowModal(false);
      setEditingId(null);
      setForm({ title: '', content: '' });
      setPollForm({ question: '', options: ['', ''] });
      setShowPollEditor(false);
      fetchAnnouncements();
    } catch (err) {
      console.error('Failed to save', err);
      showToast('Failed to post announcement', 'error');
    }
  };

  const handleLike = async (id: number) => {
    try {
      await announcementAPI.toggleLike(id);
      setAnnouncements(prev => prev.map(a => {
        if (a.id === id) {
          const newLiked = !a.user_liked;
          return { ...a, user_liked: newLiked ? 1 : 0, like_count: a.like_count + (newLiked ? 1 : -1) };
        }
        return a;
      }));
    } catch (err) {}
  };

  const handlePin = async (id: number) => {
    try {
      await announcementAPI.togglePin(id);
      fetchAnnouncements();
    } catch (err) {}
  };

  const handleVote = async (annId: number, optIdx: number) => {
    try {
      const res = await announcementAPI.votePoll(annId, optIdx);
      setAnnouncements(prev => prev.map(a => a.id === annId ? { ...a, poll_data: res.data.poll_data } : a));
    } catch (err) {}
  };

  const handleExpand = async (id: number) => {
    loadComments(id);
  };

  const handleViewViewers = async (e: React.MouseEvent, annId: number) => {
    e.stopPropagation();
    try {
      const res = await announcementAPI.getViewers(annId);
      setViewersModal({ list: res.data });
    } catch (err) {}
  };

  const handleHoverViewers = async (id: number) => {
    setActiveHoverId(id);
    if (!hoveredViewers[id]) {
      try {
        const res = await announcementAPI.getViewers(id);
        setHoveredViewers(prev => ({ ...prev, [id]: res.data }));
      } catch (err) {}
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await announcementAPI.delete(id);
      fetchAnnouncements();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleAddComment = async (annId: number) => {
    if (!newComment.trim()) return;
    try {
      await announcementAPI.addComment(annId, newComment);
      const res = await announcementAPI.getComments(annId);
      setComments({ ...comments, [annId]: res.data });
      setNewComment('');
      setShowEmojiPicker(null);
    } catch (err) {
      console.error('Comment failed', err);
    }
  };

  const handleDeleteComment = async (commentId: number, annId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await announcementAPI.deleteComment(commentId);
      const res = await announcementAPI.getComments(annId);
      setComments({ ...comments, [annId]: res.data });
    } catch (err) {}
  };

  const handleStartEdit = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.content);
  };

  const handleSaveComment = async (commentId: number, annId: number) => {
    if (!editCommentText.trim()) return;
    try {
      await announcementAPI.updateComment(commentId, editCommentText);
      setEditingCommentId(null);
      const res = await announcementAPI.getComments(annId);
      setComments({ ...comments, [annId]: res.data });
    } catch (err) {
      console.error("Edit failed", err);
    }
  };

  const addEmoji = (emoji: string) => {
    setNewComment(prev => prev + emoji);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', { 
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  const filteredAnnouncements = announcements.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && announcements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Loading Announcements...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-20 pt-4 px-4">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white dark:bg-surface-dark p-4 md:p-6 rounded-[2rem] md:rounded-3xl border border-gray-100 dark:border-white/5 shadow-xl shadow-black/5">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-500/10 dark:bg-gold-500/10 border border-primary-500/20 dark:border-gold-500/20 rounded-xl md:rounded-2xl flex items-center justify-center text-primary-500 dark:text-gold-500 shadow-inner">
             <FiBell size={20} className="animate-pulse" />
          </div>
          <div>
             <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white leading-none mb-1 tracking-tight">Announcements</h1>
             <p className="text-[9px] md:text-[10px] uppercase font-black text-gray-400 tracking-widest opacity-70">Company Hub & Official Updates</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-1 lg:max-w-2xl justify-end">
           <div className="relative flex-1">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search updates..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary-500/30 dark:focus:border-gold-500/30 rounded-2xl text-sm outline-none transition-all dark:text-white"
              />
           </div>
           {canManage && (
              <button 
                  onClick={() => { setEditingId(null); setForm({ title: '', content: '' }); setPollForm({ question: '', options: ['', ''] }); setShowPollEditor(false); setShowModal(true); }}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 dark:bg-gold-500 dark:hover:bg-gold-600 text-white dark:text-darker rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-lg shadow-primary-500/20 dark:shadow-gold-500/10 transition-all active:scale-95 whitespace-nowrap"
              >
                  <FiPlus size={18} /> New Update
              </button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {filteredAnnouncements.length === 0 ? (
          <div className="bg-white dark:bg-surface-dark rounded-3xl border border-dashed border-gray-200 dark:border-white/10 text-center py-20 md:py-32 shadow-sm">
             <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiInfo size={32} className="text-gray-200 dark:text-gray-700" />
             </div>
             <p className="text-xs md:text-sm font-black text-gray-400 uppercase tracking-[0.2em]">No updates found</p>
          </div>
        ) : (
          filteredAnnouncements.map((ann) => (
            <div key={ann.id} className={`bg-white dark:bg-surface-dark rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 border transition-all relative group ${ann.is_pinned ? 'border-primary-500/30 dark:border-gold-500/30 ring-1 ring-primary-500/10 dark:ring-gold-500/10' : 'border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02]'}`}>
              
              {ann.is_pinned === 1 && (
                <div className="absolute top-4 right-5 md:top-6 md:right-8 flex items-center gap-1.5 px-3 py-1 bg-primary-500/10 dark:bg-gold-500/10 text-primary-500 dark:text-gold-500 rounded-full border border-primary-500/20 dark:border-gold-500/20">
                   <FiMapPin size={9} className="fill-current" />
                   <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">Pinned</span>
                </div>
              )}

              <div className="flex justify-between items-start gap-4 mb-6 md:mb-8">
                 <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/10 dark:to-white/5 flex items-center justify-center text-gray-700 dark:text-gray-300 text-base md:text-lg font-black uppercase border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
                       {ann.sender_image ? (
                         <img 
                           src={`${API_URL}/auth/profile/image/${ann.sender_image}`} 
                           alt={ann.sender_name} 
                           className="w-full h-full object-cover" 
                           crossOrigin="anonymous" 
                         />
                       ) : (
                         ann.sender_name?.[0] || 'A'
                       )}
                    </div>
                    <div>
                       <h3 className="text-xs md:text-sm font-black text-gray-900 dark:text-white capitalize leading-tight">{ann.sender_name}</h3>
                       <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{formatDate(ann.created_at)}</p>
                          <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></span>
                          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary-500 dark:text-gold-500 opacity-80">{ann.sender_role?.replace('_', ' ')}</span>
                       </div>
                    </div>
                 </div>
                 <div className="flex gap-1 md:gap-2">
                    {canManage && (
                      <button onClick={() => handlePin(ann.id)} title={ann.is_pinned ? "Unpin" : "Pin to top"} className={`p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all border ${ann.is_pinned ? 'bg-primary-500 text-white border-primary-600 shadow-lg shadow-primary-500/20' : 'text-gray-400 hover:text-primary-500 border-transparent hover:bg-primary-500/5'}`}>
                         <FiMapPin size={14} />
                      </button>
                    )}
                    {canManage && (
                       <div className="flex gap-1 bg-gray-50 dark:bg-white/5 p-1 rounded-lg md:rounded-xl border border-gray-100 dark:border-white/5">
                          <button onClick={() => { setEditingId(ann.id); setForm({ title: ann.title, content: ann.content }); setPollForm({ question: '', options: ['', ''] }); setShowPollEditor(false); setShowModal(true); }} className="p-1.5 md:p-2 text-gray-400 hover:text-primary-500 transition-all"><FiEdit2 size={14} /></button>
                          <button onClick={() => handleDelete(ann.id)} className="p-1.5 md:p-2 text-gray-400 hover:text-red-500 transition-all"><FiTrash2 size={14} /></button>
                       </div>
                    )}
                 </div>
              </div>

              <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                 <h2 className="text-lg md:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">{ann.title}</h2>
                 <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed opacity-90">{ann.content}</p>
                 
                 {/* Poll UI */}
                 {ann.poll_data && (
                    <div className="mt-8 p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                         <FiBarChart2 className="text-primary-500 dark:text-gold-500" />
                          <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">{ann.poll_data.question}</h4>
                      </div>
                      <div className="space-y-3">
                         {ann.poll_data.options.map((opt: any, idx: number) => {
                            const totalVotes = ann.poll_data.options.reduce((sum: number, o: any) => sum + o.votes.length, 0);
                            const percentage = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                            const hasVoted = opt.votes.includes(user?.id);
                            
                            return (
                               <button 
                                 key={idx} 
                                 onClick={() => handleVote(ann.id, idx)}
                                 className={`w-full relative p-4 rounded-2xl border text-left transition-all overflow-hidden group/poll ${hasVoted ? 'border-primary-500 bg-primary-500/5' : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-primary-500/50'}`}
                               >
                                  <div className="absolute inset-0 bg-primary-500/10 dark:bg-gold-500/10 transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                                  <div className="relative flex justify-between items-center z-10">
                                     <span className="text-sm font-bold text-gray-900 dark:text-white">{opt.text}</span>
                                      <span className="text-xs font-black text-gray-500">{percentage}%</span>
                                   </div>
                                </button>
                             );
                          })}
                       </div>
                    </div>
                  )}
               </div>

               {/* Action Bar */}
               <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-4 mt-4">
                  <div className="flex items-center gap-6">
                     {/* Like Button */}
                     <button 
                        onClick={(e) => { e.stopPropagation(); handleLike(ann.id); }}
                        className={`flex items-center gap-2 text-sm font-bold transition-all active:scale-90 ${ann.user_liked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-500'}`}
                     >
                        <FiHeart size={18} className={ann.user_liked ? 'fill-current' : ''} />
                        <span>{ann.like_count || 0}</span>
                     </button>

                     {/* Viewers Button with Hover & Modal Click */}
                     <div 
                        className="flex items-center gap-2 text-sm font-bold text-gray-400 group cursor-pointer relative z-20"
                        onMouseEnter={() => handleHoverViewers(ann.id)}
                        onMouseLeave={() => setActiveHoverId(null)}
                        onClick={(e) => { e.stopPropagation(); handleViewViewers(e, ann.id); }}
                     >
                        <FiEye size={18} className="group-hover:text-primary-500 transition-colors" />
                        <span className="group-hover:text-primary-500 transition-colors">{ann.views || 0}</span>

                        {/* Hover Viewers Tooltip */}
                        {activeHoverId === ann.id && hoveredViewers[ann.id] && (
                           <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-52 bg-white dark:bg-[#1e1e24] border border-gray-100 dark:border-white/10 shadow-2xl rounded-2xl p-3 animate-fade-in pointer-events-none z-50">
                              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-[#1e1e24] rotate-45 border-r border-b border-gray-100 dark:border-white/10"></div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 pb-1 border-b border-gray-50 dark:border-white/5 text-center">Viewers List</p>
                              <div className="space-y-2">
                                 {hoveredViewers[ann.id].length === 0 ? (
                                    <p className="text-[10px] text-center italic text-gray-400">No views recorded</p>
                                 ) : (
                                    hoveredViewers[ann.id].slice(0, 5).map((v, i) => (
                                       <div key={i} className="flex items-center gap-2 text-[11px]">
                                          <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                             {v.profile_image ? (
                                                <img src={`${API_URL}/auth/profile/image/${v.profile_image}`} className="w-full h-full object-cover" crossOrigin="anonymous" />
                                             ) : (
                                                <span className="text-[9px] font-black text-indigo-500">{v.name?.[0]?.toUpperCase()}</span>
                                             )}
                                          </div>
                                          <span className="font-bold text-gray-700 dark:text-gray-200 truncate flex-1 capitalize">{v.name}</span>
                                       </div>
                                    ))
                                 )}
                                 {hoveredViewers[ann.id].length > 5 && (
                                    <p className="text-[9px] text-center font-black text-primary-500 dark:text-gold-500 pt-1 border-t border-gray-50 dark:border-white/5">+ Click to view all {hoveredViewers[ann.id].length}</p>
                                 )}
                              </div>
                           </div>
                        )}
                     </div>

                     {/* Comments Button */}
                     <button 
                        onClick={(e) => { e.stopPropagation(); handleExpand(ann.id); }}
                        className={`flex items-center gap-2 text-sm font-bold transition-all active:scale-90 ${expandedId === ann.id ? 'text-primary-500 dark:text-gold-500' : 'text-gray-400 hover:text-primary-500'}`}
                     >
                        <FiMessageCircle size={18} />
                        <span>{ann.comment_count || 0}</span>
                     </button>
                  </div>
               </div>

               {expandedId === ann.id && (
                 <div className="mt-6 space-y-4 pt-6 border-t border-gray-100 dark:border-white/5 animate-slide-up">
                    <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar pr-3">
                       {comments[ann.id]?.map(c => (
                         <div key={c.id} className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex flex-shrink-0 items-center justify-center text-xs font-black text-gray-500 border border-gray-200 dark:border-white/10 overflow-hidden">
                               {c.user_image ? (
                                 <img 
                                   src={`${API_URL}/auth/profile/image/${c.user_image}`} 
                                   alt={c.user_name} 
                                   className="w-full h-full object-cover" 
                                   crossOrigin="anonymous" 
                                 />
                               ) : (
                                 c.user_name?.[0]
                               )}
                            </div>
                            <div className="bg-white/5 dark:bg-white/5 p-4 rounded-2xl rounded-tl-none flex-1 shadow-sm border border-gray-100 dark:border-white/5 group relative">
                               <div className="flex justify-between items-center mb-1">
                                  <p className="text-xs font-black dark:text-white uppercase tracking-tight">{c.user_name}</p>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[9px] font-bold text-gray-400">{formatDate(c.created_at)}</span>
                                     {user?.id === c.user_id && editingCommentId !== c.id && (
                                       <button onClick={() => handleStartEdit(c)} className="text-gray-400 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <FiEdit2 size={11}/>
                                       </button>
                                     )}
                                     {(user?.id === c.user_id || user?.role === 'admin') && editingCommentId !== c.id && (
                                       <button onClick={() => handleDeleteComment(c.id, ann.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <FiTrash2 size={12}/>
                                       </button>
                                     )}
                                  </div>
                               </div>
                               {editingCommentId === c.id ? (
                                  <div className="mt-1 flex items-center gap-2">
                                     <input 
                                        type="text" 
                                        value={editCommentText} 
                                        onChange={(e) => setEditCommentText(e.target.value)}
                                        autoFocus
                                        className="w-full text-sm bg-white dark:bg-white/5 border border-primary-500/30 rounded-lg px-3 py-1.5 focus:outline-none dark:text-white"
                                     />
                                     <button onClick={() => handleSaveComment(c.id, ann.id)} className="p-2 bg-emerald-500 text-white rounded-lg text-xs shadow-sm"><FiCheck size={12}/></button>
                                     <button onClick={() => setEditingCommentId(null)} className="p-2 bg-gray-200 dark:bg-white/10 text-gray-500 rounded-lg text-xs"><FiX size={12}/></button>
                                  </div>
                               ) : (
                                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{c.content}</p>
                               )}
                            </div>
                         </div>
                       ))}
                       {(!comments[ann.id] || comments[ann.id].length === 0) && (
                        <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest py-4">No comments yet. Be the first!</p>
                      )}
                   </div>

                   <div className="relative mt-6">
                      <input 
                         type="text" 
                         placeholder="Share your thoughts..." 
                         value={newComment}
                         onChange={e => setNewComment(e.target.value)}
                         onKeyDown={e => e.key === 'Enter' && handleAddComment(ann.id)}
                         className="w-full pl-6 pr-14 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary-500/20 dark:border-white/10 rounded-2xl text-sm outline-none shadow-inner dark:text-white"
                      />
                      <button 
                        onClick={() => handleAddComment(ann.id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-primary-500 text-white rounded-xl shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-all active:scale-90"
                      >
                         <FiSend size={18} />
                      </button>
                   </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white dark:bg-surface-dark w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 animate-slide-up">
              <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/3">
                 <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter">{editingId ? 'Edit Update' : 'Broadcast New Update'}</h2>
                 <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-white dark:bg-white/5 rounded-xl"><FiX size={24} /></button>
              </div>
              <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                 <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Headline / Title</label>
                        <input 
                           type="text" 
                           required 
                           value={form.title}
                           onChange={e => setForm({ ...form, title: e.target.value })}
                           placeholder="What's happening?"
                           className="w-full px-6 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary-500/20 rounded-2xl text-sm font-bold outline-none dark:text-white shadow-inner transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Detailed Content</label>
                        <textarea 
                           required 
                           value={form.content}
                           onChange={e => setForm({ ...form, content: e.target.value })}
                           placeholder="Share the full details here..."
                           className="w-full px-6 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary-500/20 rounded-2xl text-sm h-40 outline-none dark:text-white resize-none shadow-inner transition-all leading-relaxed"
                        />
                    </div>
                 </div>

                 {/* Poll Editor */}
                 <div className="p-6 bg-primary-500/5 dark:bg-gold-500/5 rounded-3xl border border-dashed border-primary-500/20 dark:border-gold-500/20">
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-2">
                          <FiBarChart2 className="text-primary-500" />
                          <span className="text-xs font-black uppercase tracking-widest dark:text-white">Interactive Poll</span>
                       </div>
                       <button type="button" onClick={() => setShowPollEditor(!showPollEditor)} className={`text-[10px] font-black px-3 py-1 rounded-full transition-all ${showPollEditor ? 'bg-red-500 text-white' : 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'}`}>
                          {showPollEditor ? 'Remove Poll' : '+ Add Poll'}
                       </button>
                    </div>

                    {showPollEditor && (
                       <div className="space-y-4 animate-slide-up">
                          <input 
                            type="text" 
                            placeholder="Ask a question..." 
                            value={pollForm.question}
                            onChange={e => setPollForm({ ...pollForm, question: e.target.value })}
                            className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl text-sm outline-none dark:text-white"
                          />
                          <div className="space-y-2">
                             {pollForm.options.map((opt, i) => (
                                <div key={i} className="flex gap-2">
                                   <input 
                                     type="text" 
                                     placeholder={`Option ${i+1}`}
                                     value={opt}
                                     onChange={e => {
                                        const newOpts = [...pollForm.options];
                                        newOpts[i] = e.target.value;
                                        setPollForm({ ...pollForm, options: newOpts });
                                     }}
                                     className="flex-1 px-4 py-2 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl text-sm outline-none dark:text-white"
                                   />
                                   {pollForm.options.length > 2 && (
                                     <button type="button" onClick={() => setPollForm({ ...pollForm, options: pollForm.options.filter((_, idx) => idx !== i) })} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><FiX /></button>
                                   )}
                                </div>
                             ))}
                             <button type="button" onClick={() => setPollForm({ ...pollForm, options: [...pollForm.options, ''] })} className="text-[10px] font-black text-primary-500 uppercase tracking-widest hover:underline">+ Add Option</button>
                          </div>
                       </div>
                    )}
                 </div>

                 <button type="submit" className="w-full py-5 bg-primary-600 hover:bg-primary-700 dark:bg-gold-500 dark:hover:bg-gold-600 text-white dark:text-darker rounded-2xl font-black shadow-xl shadow-primary-500/30 transition-all active:scale-95 uppercase tracking-[0.2em] text-xs">
                    {editingId ? 'Update Broadcast' : 'Launch Broadcast'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {viewersModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4" onClick={() => setViewersModal(null)}>
          <div className="bg-white dark:bg-surface-dark rounded-3xl w-full max-w-sm shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiEye className="text-indigo-500" size={18} />
                <h3 className="font-black text-sm uppercase tracking-widest dark:text-white">Viewed By ({viewersModal.list.length})</h3>
              </div>
              <button onClick={() => setViewersModal(null)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><FiX size={18} /></button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto space-y-2">
              {viewersModal.list.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-8 uppercase tracking-widest font-bold">No views yet</p>
              ) : (
                viewersModal.list.map((v: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-white/10 dark:to-white/5 flex items-center justify-center text-xs font-black text-indigo-600 dark:text-gray-300 overflow-hidden flex-shrink-0">
                      {v.profile_image ? (
                        <img src={`${API_URL}/auth/profile/image/${v.profile_image}`} alt={v.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                      ) : (
                        v.name?.[0]?.toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white capitalize truncate">{v.name}</p>
                      <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">{v.role?.replace('_', ' ')}</p>
                    </div>
                    <span className="text-[9px] text-gray-400 font-bold whitespace-nowrap">
                      {new Date(v.viewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold transition-all animate-fade-in ${
          toast.type === 'success'
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
        }`}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          {toast.msg}
        </div>
      )}

      <style jsx global>{`
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
