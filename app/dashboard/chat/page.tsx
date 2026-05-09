'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { messageAPI } from '../../utils/api';
import { FiSend, FiSearch, FiMoreVertical, FiPaperclip, FiSmile, FiCheck, FiArrowLeft, FiUser, FiMessageSquare, FiShield, FiClock, FiDownload, FiFile, FiImage, FiX, FiEdit2, FiPlus, FiUsers } from 'react-icons/fi';
import GlowCard from '../../components/GlowCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const COMMON_EMOJIS = ['😊', '😂', '👍', '🔥', '❤️', '🙌', '🎉', '💻', '🚀', '✅', '✨', '🤔', '👋', '🙏', '💯', '🌟', '🤯', '😎', '💡', '📢'];

const formatTime = (iso: string | null) => {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const formatDateLong = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const getDayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export default function ChatPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [filter, setFilter] = useState<'all' | 'chat' | 'group'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchContacts();
    const interval = setInterval(fetchContacts, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedContact) {
      fetchHistory(selectedContact.id, selectedContact.is_group);
      const historyInterval = setInterval(() => fetchHistory(selectedContact.id, selectedContact.is_group), 3000);
      return () => clearInterval(historyInterval);
    } else {
        setMessages([]);
    }
  }, [selectedContact]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchContacts = async () => {
    try {
      const res = await messageAPI.getContacts();
      const sorted = [...res.data].sort((a, b) => {
        const ta = a.last_message?.timestamp || '';
        const tb = b.last_message?.timestamp || '';
        return tb.localeCompare(ta);
      });
      setContacts(sorted);
    } catch (err) {
      console.error('Failed to fetch contacts', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (id: number, isGroup: boolean) => {
    try {
      const res = await messageAPI.getHistory(id, isGroup);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;

    try {
      if (editingMessage) {
        await messageAPI.editMessage(editingMessage.id, newMessage);
        setMessages(messages.map(m => m.id === editingMessage.id ? { ...m, content: newMessage, is_edited: 1 } : m));
        setEditingMessage(null);
      } else {
        const payload = selectedContact.is_group 
          ? { group_id: selectedContact.id, content: newMessage }
          : { receiver_id: selectedContact.id, content: newMessage };
          
        const res = await messageAPI.sendMessage(payload);
        setMessages([...messages, {
          id: res.data.id,
          sender_id: user?.id,
          content: newMessage,
          timestamp: new Date().toISOString(),
          is_read: 0,
          is_edited: 0,
          sender_name: user?.name,
          sender_image: user?.profile_image
        }]);
      }
      setNewMessage('');
      setShowEmojiPicker(false);
      fetchContacts();
    } catch (err: any) {
      console.error('Failed to send/edit message', err);
      alert(err?.response?.data?.error || err?.message || 'Failed to send message');
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || selectedMembers.length === 0) return;

    try {
      await messageAPI.createGroup({ name: newGroupName, member_ids: selectedMembers });
      setShowCreateGroup(false);
      setNewGroupName('');
      setSelectedMembers([]);
      fetchContacts();
    } catch (err) {
      console.error('Failed to create group', err);
    }
  };

  const toggleMember = (id: number) => {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const startEditing = (msg: any) => {
    setEditingMessage(msg);
    setNewMessage(msg.content);
    setShowEmojiPicker(false);
  };

  const cancelEditing = () => {
    setEditingMessage(null);
    setNewMessage('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedContact) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await messageAPI.uploadChatMessage(formData);
      const { file_url, file_name, file_type } = uploadRes.data;

      const payload = selectedContact.is_group 
        ? { group_id: selectedContact.id, file_url, file_name, file_type, content: `Attached file: ${file_name}` }
        : { receiver_id: selectedContact.id, file_url, file_name, file_type, content: `Attached file: ${file_name}` };

      const sendRes = await messageAPI.sendMessage(payload);

      setMessages([...messages, {
        id: sendRes.data.id,
        sender_id: user?.id,
        content: `Attached file: ${file_name}`,
        file_url,
        file_name,
        file_type,
        timestamp: new Date().toISOString(),
        is_read: 0,
        is_edited: 0,
        sender_name: user?.name,
        sender_image: user?.profile_image
      }]);
      fetchContacts();
    } catch (err) {
      console.error('Failed to upload file', err);
      alert('File upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (filename: string, originalName: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(messageAPI.getDownloadUrl(filename), {
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

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (filter === 'group') return c.is_group;
    if (filter === 'chat') return !c.is_group;
    return true;
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  if (loading && contacts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-100px)] gap-4 animate-fade-in relative">
      {/* Contact List Sidebar */}
      <div className={`w-full md:w-80 flex flex-col gap-4 ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex-1 flex flex-col bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 rounded-3xl overflow-hidden shadow-xl shadow-black/5">
          <div className="p-4 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-black text-shimmer">Messenger</h1>
              <button 
                onClick={() => setShowCreateGroup(true)}
                className="p-2 bg-primary-500/10 dark:bg-gold-500/10 text-primary-500 dark:text-gold-500 hover:bg-primary-500 dark:hover:bg-gold-500 hover:text-white dark:hover:text-darker rounded-xl transition-all"
                title="Create Group"
              >
                <FiPlus size={18} />
              </button>
            </div>
            <div className="relative mb-3">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-4 focus:ring-primary-500/10 dark:focus:ring-gold-500/10 outline-none transition-all dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setFilter('all')} 
                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-primary-500 dark:bg-gold-500 text-white dark:text-darker shadow-lg shadow-primary-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-gray-600'}`}>
                All
              </button>
              <button 
                onClick={() => setFilter('chat')} 
                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'chat' ? 'bg-primary-500 dark:bg-gold-500 text-white dark:text-darker shadow-lg shadow-primary-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-gray-600'}`}>
                Chat
              </button>
              <button 
                onClick={() => setFilter('group')} 
                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'group' ? 'bg-primary-500 dark:bg-gold-500 text-white dark:text-darker shadow-lg shadow-primary-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-gray-600'}`}>
                Group
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm italic">
                No conversations found
              </div>
            ) : (
              filteredContacts.map(contact => (
                <div
                  key={`${contact.is_group ? 'g' : 'u'}-${contact.id}`}
                  onClick={() => setSelectedContact(contact)}
                  className={`flex items-center gap-3 p-4 cursor-pointer transition-all border-l-4 ${
                    selectedContact?.id === contact.id && selectedContact?.is_group === contact.is_group
                      ? 'bg-primary-500/10 dark:bg-gold-500/10 border-primary-500 dark:border-gold-500 active-contact-glow'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg overflow-hidden ${contact.is_group ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-primary-500 to-secondary-500'}`}>
                      {contact.is_group ? (
                        <FiUsers size={20} />
                      ) : contact.profile_image ? (
                        <img 
                          src={`${API_URL}/auth/profile/image/${contact.profile_image}`} 
                          alt={contact.name} 
                          className="w-full h-full object-cover" 
                          crossOrigin="anonymous" 
                        />
                      ) : (
                        getInitials(contact.name)
                      )}
                    </div>
                    {contact.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white dark:border-dark-card font-bold animate-bounce">
                        {contact.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-gray-900 dark:text-white truncate text-sm">
                        {contact.name}
                      </h3>
                      {contact.last_message && (
                        <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                          {formatTime(contact.last_message.timestamp)}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate pr-2">
                        {contact.is_group && contact.last_message && <span className="font-bold mr-1">{contact.last_message.sender_name}:</span>}
                        {contact.last_message?.file_name && <FiPaperclip size={10} className="inline mr-1" />}
                        {contact.last_message ? contact.last_message.content : 'Start a conversation'}
                      </p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${contact.is_group ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                        {contact.is_group ? 'Group' : contact.role?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 rounded-3xl overflow-hidden shadow-xl shadow-black/5 ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="p-3 md:p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-black/40 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-2 md:gap-3">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="md:hidden p-2 -ml-2 text-gray-500 hover:text-primary-500 transition-colors"
                >
                  <FiArrowLeft size={20} />
                </button>
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md overflow-hidden ${selectedContact.is_group ? 'bg-gradient-to-tr from-indigo-600 to-purple-600' : 'bg-gradient-to-tr from-primary-600 to-secondary-600'}`}>
                  {selectedContact.is_group ? (
                    <FiUsers size={16} />
                  ) : selectedContact.profile_image ? (
                    <img 
                      src={`${API_URL}/auth/profile/image/${selectedContact.profile_image}`} 
                      alt={selectedContact.name} 
                      className="w-full h-full object-cover" 
                      crossOrigin="anonymous" 
                    />
                  ) : (
                    getInitials(selectedContact.name)
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-white leading-tight truncate text-sm md:text-base">
                    {selectedContact.name}
                  </h3>
                  <p className="text-[8px] md:text-[10px] text-gray-500 dark:text-gold-500 flex items-center gap-1 uppercase tracking-widest font-semibold">
                    <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {selectedContact.is_group ? 'Active Group' : `Online`}
                  </p>
                </div>
              </div>
              <div className="flex gap-0.5 md:gap-1">
                <button className="p-2 text-gray-400 hover:text-primary-500 transition-colors rounded-lg hover:bg-primary-500/5">
                  <FiSearch size={16} />
                </button>
                <button className="p-2 text-gray-400 hover:text-primary-500 transition-colors rounded-lg hover:bg-primary-500/5">
                  <FiMoreVertical size={16} />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 custom-scrollbar bg-slate-50/30 dark:bg-black/10">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50 py-10 scale-90">
                   <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-200 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                      <FiMessageSquare size={28} className="text-gray-400" />
                   </div>
                   <p className="text-[10px] md:text-sm dark:text-white font-bold uppercase tracking-widest">No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isOwn = msg.sender_id === user?.id;
                  const showDate = i === 0 || 
                    getDayKey(msg.timestamp) !== getDayKey(messages[i-1].timestamp);
                  const showSenderName = selectedContact.is_group && !isOwn && (i === 0 || messages[i-1].sender_id !== msg.sender_id);

                  return (
                    <div key={msg.id} className="space-y-4">
                       {showDate && (
                         <div className="flex justify-center my-6">
                            <span className="px-3 py-1 bg-gray-200/50 dark:bg-white/5 text-[9px] md:text-[10px] text-gray-500 dark:text-gray-400 rounded-full font-medium uppercase tracking-tighter">
                               {formatDateLong(msg.timestamp)}
                            </span>
                         </div>
                       )}
                       <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group transition-all duration-300`}>
                        <div className={`flex items-end gap-2 max-w-[90%] md:max-w-[75%]`}>
                          {!isOwn && selectedContact.is_group && (
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-white/5 flex items-center justify-center text-[9px] font-bold">
                              {msg.sender_image ? (
                                <img 
                                  src={`${API_URL}/auth/profile/image/${msg.sender_image}`} 
                                  alt={msg.sender_name} 
                                  className="w-full h-full object-cover" 
                                  crossOrigin="anonymous" 
                                />
                              ) : (
                                getInitials(msg.sender_name || 'U')
                              )}
                            </div>
                          )}
                          <div className={`space-y-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                            {showSenderName && (
                               <span className="text-[9px] md:text-[10px] font-black text-primary-500 dark:text-gold-500 uppercase tracking-widest ml-1">{msg.sender_name}</span>
                            )}
                            <div className={`relative px-3 md:px-4 py-2 md:py-3 rounded-xl md:rounded-2xl text-[13px] md:text-sm shadow-sm transition-all duration-300 ${
                              isOwn 
                                ? 'bg-primary-600 dark:bg-gold-500 text-white dark:text-darker rounded-tr-none' 
                                : 'bg-white dark:bg-white/10 dark:text-white rounded-tl-none border border-gray-100 dark:border-white/5'
                            } ${editingMessage?.id === msg.id ? 'ring-4 ring-primary-500/20 dark:ring-gold-500/20' : ''}`}>
                              
                              {isOwn && !msg.file_url && (
                                <button 
                                  onClick={() => startEditing(msg)}
                                  className={`absolute ${isOwn ? '-left-10' : '-right-10'} top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary-500 dark:hover:text-gold-500 opacity-0 group-hover:opacity-100 transition-all active:scale-95`}
                                  title="Edit message"
                                >
                                  <FiEdit2 size={16} />
                                </button>
                              )}

                              {msg.file_url ? (
                                <div className="flex flex-col gap-2">
                                  {msg.file_type?.startsWith('image/') ? (
                                    <div className="relative group cursor-pointer overflow-hidden rounded-xl bg-black/5" onClick={() => handleDownload(msg.file_url, msg.file_name)}>
                                       <div className="p-6 flex flex-col items-center gap-2 border border-dashed border-gray-100 dark:border-white/20 rounded-xl">
                                          <FiImage size={32} />
                                          <span className="text-[10px] font-bold truncate w-full text-center">{msg.file_name}</span>
                                       </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3 p-3 bg-black/10 dark:bg-white/5 rounded-xl border border-white/10">
                                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                        <FiFile size={20} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold truncate">{msg.file_name}</p>
                                        <p className="text-[10px] opacity-60 uppercase">{msg.file_type?.split('/')[1]}</p>
                                      </div>
                                      <button 
                                        onClick={() => handleDownload(msg.file_url, msg.file_name)}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                        title="Download"
                                      >
                                        <FiDownload size={16} />
                                      </button>
                                    </div>
                                  )}
                                  {msg.content && msg.content !== `Attached file: ${msg.file_name}` && <p className="mt-1">{msg.content}</p>}
                                </div>
                              ) : (
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                              )}
                              
                              <div className={`flex items-center gap-1.5 mt-1.5 ${isOwn ? 'justify-end text-white/70 dark:text-darker/70' : 'justify-start text-gray-400'}`}>
                                {msg.is_edited === 1 && <span className="text-[9px] font-black italic uppercase tracking-tighter opacity-70">Edited</span>}
                                <span className="text-[9px] font-medium uppercase">
                                  {formatTime(msg.timestamp)}
                                </span>
                                {isOwn && !selectedContact.is_group && (
                                  <div className="flex -space-x-1">
                                    <FiCheck size={10} className={msg.is_read ? (isOwn && user?.role !== 'admin' ? "text-blue-100" : "text-emerald-400") : ""} />
                                    {msg.is_read ? <FiCheck size={10} className={isOwn && user?.role !== 'admin' ? "text-blue-100" : "text-emerald-400"} /> : null}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                       </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Area */}
            <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-surface-dark sticky bottom-0">
              {uploading && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary-600 dark:bg-gold-500 dark:text-darker text-white rounded-full text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white dark:border-darker/30 dark:border-t-darker rounded-full animate-spin"></div>
                  Uploading file...
                </div>
              )}

              {editingMessage && (
                <div className="flex items-center justify-between mb-3 px-4 py-2 bg-primary-500/10 dark:bg-gold-500/10 border-l-4 border-primary-500 dark:border-gold-500 rounded-lg animate-slide-up">
                   <div className="flex items-center gap-3">
                      <FiEdit2 size={14} className="text-primary-500 dark:text-gold-500" />
                      <div className="min-w-0">
                         <p className="text-[10px] font-black uppercase text-primary-500 dark:text-gold-500 tracking-widest leading-none mb-1">Editing Message</p>
                         <p className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-sm">{editingMessage.content}</p>
                      </div>
                   </div>
                   <button onClick={cancelEditing} className="p-1 hover:text-red-500 transition-colors"><FiX size={18} /></button>
                </div>
              )}
              
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 relative">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                
                {!editingMessage && (
                   <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-3 text-gray-400 hover:text-primary-500 dark:hover:text-gold-500 transition-colors rounded-xl hover:bg-primary-500/5 dark:hover:bg-gold-500/5">
                    <FiPaperclip size={20} />
                  </button>
                )}
                
                <div className="flex-1 relative group">
                  <input
                    type="text"
                    placeholder={editingMessage ? "Update message..." : "Type your message..."}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className={`w-full px-5 py-3.5 bg-gray-50 dark:bg-white/5 border rounded-2xl text-sm focus:ring-4 focus:ring-primary-500/10 dark:focus:ring-gold-500/10 outline-none transition-all dark:text-white pr-12 ${editingMessage ? 'border-primary-500/50 dark:border-gold-500/50 ring-2 ring-primary-500/5 dark:ring-gold-500/5' : 'border-gray-200 dark:border-white/10 focus:border-primary-500 dark:focus:border-gold-500'}`}
                  />
                  <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${showEmojiPicker ? 'text-primary-500 dark:text-gold-500' : 'text-gray-400 hover:text-primary-500 dark:hover:text-gold-500'}`} >
                    <FiSmile size={20} />
                  </button>

                  {showEmojiPicker && (
                    <div className="absolute bottom-full right-0 mb-4 p-3 bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl z-50 animate-slide-up w-64 ring-4 ring-black/5">
                       <div className="flex items-center justify-between mb-3 px-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Quick Emojis</span>
                          <button onClick={() => setShowEmojiPicker(false)} className="text-gray-400 hover:text-red-500"><FiX size={14} /></button>
                       </div>
                       <div className="grid grid-cols-5 gap-2">
                          {COMMON_EMOJIS.map(emoji => (
                             <button key={emoji} type="button" onClick={() => addEmoji(emoji)} className="w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all hover:scale-125" >
                                {emoji}
                             </button>
                          ))}
                       </div>
                    </div>
                  )}
                </div>
                
                <button type="submit" disabled={!newMessage.trim() || uploading} className="p-4 bg-primary-600 hover:bg-primary-700 dark:bg-gold-500 dark:hover:bg-gold-600 disabled:opacity-50 disabled:grayscale transition-all text-white dark:text-darker rounded-2xl shadow-lg shadow-primary-500/30 flex items-center justify-center active:scale-95" >
                  {editingMessage ? <FiCheck size={20} /> : <FiSend size={20} />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/20 dark:bg-black/5">
            <div className="mb-8 relative">
               <div className="w-32 h-32 bg-primary-500/10 dark:bg-gold-500/10 rounded-full flex items-center justify-center animate-pulse"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                  <FiMessageSquare size={48} className="text-primary-500 dark:text-gold-500" />
               </div>
            </div>
            <h2 className="text-2xl font-black text-shimmer mb-2 uppercase tracking-tighter">Your Messages</h2>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-xs leading-relaxed text-sm">
              Select a team member or a group from the left to start a conversation. 
            </p>
          </div>
        )}
      </div>

      {/* Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 animate-slide-up">
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/3">
                 <h2 className="text-xl font-black text-shimmer uppercase tracking-tighter">Create New Group</h2>
                 <button onClick={() => setShowCreateGroup(false)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><FiX size={20} /></button>
              </div>
              <form onSubmit={handleCreateGroup} className="p-6 space-y-6">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 block">Group Name</label>
                    <input 
                      type="text" 
                      required 
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      placeholder="e.g. Marketing Team"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-4 focus:ring-primary-500/10 outline-none transition-all dark:text-white"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 block">Select Members ({selectedMembers.length})</label>
                    <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar pr-2">
                       {contacts.filter(c => !c.is_group).map(u => (
                          <div 
                            key={u.id} 
                            onClick={() => toggleMember(u.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedMembers.includes(u.id) ? 'bg-primary-500/10 dark:bg-gold-500/10 border border-primary-500/20 dark:border-gold-500/20' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                          >
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white overflow-hidden bg-gradient-to-br from-primary-400 to-secondary-400`}>
                                {u.profile_image ? (
                                  <img 
                                    src={`${API_URL}/auth/profile/image/${u.profile_image}`} 
                                    alt={u.name} 
                                    className="w-full h-full object-cover" 
                                    crossOrigin="anonymous" 
                                  />
                                ) : (
                                  getInitials(u.name)
                                )}
                             </div>
                             <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate dark:text-white">{u.name}</p>
                                <p className="text-[10px] text-gray-500 uppercase">{u.role?.replace('_', ' ')}</p>
                             </div>
                             <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedMembers.includes(u.id) ? 'bg-primary-500 dark:bg-gold-500 border-primary-500 dark:border-gold-500' : 'border-gray-200 dark:border-white/10'}`}>
                                {selectedMembers.includes(u.id) && <FiCheck size={12} className="text-white dark:text-darker" />}
                             </div>
                          </div>
                        ))}
                    </div>
                 </div>
                 <button 
                  type="submit" 
                  disabled={!newGroupName.trim() || selectedMembers.length === 0}
                  className="w-full py-4 bg-primary-600 hover:bg-primary-700 dark:bg-gold-500 dark:hover:bg-gold-600 dark:text-darker text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95 uppercase tracking-widest text-xs"
                 >
                    Create and Start Chatting
                 </button>
              </form>
           </div>
        </div>
      )}

      <style jsx global>{`
        .text-shimmer {
          background: linear-gradient(90deg, #6366f1, #a855f7, #6366f1);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 5s linear infinite;
        }
        .dark .text-shimmer {
          background: linear-gradient(90deg, #F5C842, #fff, #F5C842);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 5s linear infinite;
        }
        @keyframes shimmer {
          to { background-position: 200% center; }
        }
        .active-contact-glow {
          box-shadow: inset 0 0 20px rgba(99, 102, 241, 0.05);
        }
        .dark .active-contact-glow {
          box-shadow: inset 0 0 20px rgba(245, 200, 66, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}
