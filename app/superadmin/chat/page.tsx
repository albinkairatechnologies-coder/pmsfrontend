'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { superadminAPI } from '../../utils/superadminApi';
import { useSA } from '../SAContext';
import { FiSend, FiSearch, FiMessageSquare, FiCircle } from 'react-icons/fi';

interface Contact {
  id: number;
  name: string;
  email: string;
  organisation_id: number;
  org_name: string;
  org_active: number;
  last_message: { message: string; created_at: string; sender_type: string } | null;
  unread_count: number;
}

interface Message {
  id: number;
  sender_type: 'superadmin' | 'admin';
  sender_name: string;
  message: string;
  created_at: string;
  is_read: number;
}

export default function SuperAdminChat() {
  const { superadmin }            = useSA();
  const [contacts, setContacts]   = useState<Contact[]>([]);
  const [selected, setSelected]   = useState<Contact | null>(null);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [search, setSearch]       = useState('');
  const [sending, setSending]     = useState(false);
  const [loadingC, setLoadingC]   = useState(true);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const pollRef                   = useRef<NodeJS.Timeout>();

  const loadContacts = useCallback(async () => {
    try { const r = await superadminAPI.getChatContacts(); setContacts(r.data); }
    catch {} finally { setLoadingC(false); }
  }, []);

  const loadMessages = useCallback(async (orgId: number) => {
    try { const r = await superadminAPI.getChatMessages(orgId); setMessages(r.data); }
    catch {}
  }, []);

  useEffect(() => { loadContacts(); }, []);

  useEffect(() => {
    if (!selected) return;
    loadMessages(selected.organisation_id);
    pollRef.current = setInterval(() => {
      loadMessages(selected.organisation_id);
      loadContacts();
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [selected?.organisation_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selected || sending) return;
    setSending(true);
    try {
      await superadminAPI.sendChatMessage(selected.organisation_id, input.trim());
      setInput('');
      await loadMessages(selected.organisation_id);
      await loadContacts();
    } catch {} finally { setSending(false); }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const selectContact = (c: Contact) => {
    setSelected(c);
    setMessages([]);
    setContacts(prev => prev.map(x => x.id === c.id ? { ...x, unread_count: 0 } : x));
  };

  const filtered = contacts.filter(c =>
    c.org_name.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = contacts.reduce((s, c) => s + c.unread_count, 0);

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    return d.toDateString() === now.toDateString()
      ? fmtTime(iso)
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ color: '#fff', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Organisation Chat</h1>
          {totalUnread > 0 && (
            <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(239,68,68,.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,.3)' }}>
              {totalUnread} unread
            </span>
          )}
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(156,163,175,.5)' }}>Real-time chat with organisation admins</p>
      </div>

      {/* Layout */}
      <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>

        {/* Sidebar */}
        <div style={{ width: 280, background: 'rgba(15,23,42,.8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
            <div style={{ position: 'relative' }}>
              <FiSearch size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(156,163,175,.4)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px 8px 30px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingC ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'rgba(156,163,175,.4)', fontSize: 13 }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'rgba(156,163,175,.4)' }}>
                <FiMessageSquare size={28} style={{ marginBottom: 8, opacity: .4 }} />
                <p style={{ fontSize: 13, margin: 0 }}>No org admins yet</p>
              </div>
            ) : filtered.map(c => (
              <div key={c.id} onClick={() => selectContact(c)} style={{
                padding: '12px 14px', cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,.04)',
                background: selected?.id === c.id ? 'rgba(239,68,68,.08)' : 'transparent',
                borderLeft: `3px solid ${selected?.id === c.id ? '#ef4444' : 'transparent'}`,
                transition: 'all .15s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.org_active ? '#22c55e' : '#6b7280', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.org_name}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(156,163,175,.5)', marginBottom: 3 }}>{c.name}</div>
                    {c.last_message && (
                      <div style={{ fontSize: 11, color: 'rgba(156,163,175,.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.last_message.sender_type === 'superadmin' ? 'You: ' : ''}{c.last_message.message}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    {c.last_message && <span style={{ fontSize: 10, color: 'rgba(156,163,175,.4)' }}>{fmtDate(c.last_message.created_at)}</span>}
                    {c.unread_count > 0 && (
                      <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div style={{ flex: 1, background: 'rgba(15,23,42,.8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(156,163,175,.4)' }}>
              <FiMessageSquare size={52} style={{ marginBottom: 16, opacity: .2 }} />
              <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px', color: 'rgba(255,255,255,.5)' }}>Select an organisation</p>
              <p style={{ fontSize: 13, margin: 0 }}>Choose from the left to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#ef4444' }}>
                  {selected.org_name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{selected.org_name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(156,163,175,.5)' }}>{selected.name} · {selected.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <FiCircle size={8} fill={selected.org_active ? '#22c55e' : '#6b7280'} color={selected.org_active ? '#22c55e' : '#6b7280'} />
                  <span style={{ fontSize: 11, color: selected.org_active ? '#22c55e' : '#6b7280' }}>{selected.org_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'rgba(156,163,175,.4)', fontSize: 13, marginTop: 60 }}>
                    No messages yet. Say hello! 👋
                  </div>
                )}
                {messages.map((msg, i) => {
                  const isMine = msg.sender_type === 'superadmin';
                  const showDate = i === 0 || new Date(messages[i-1].created_at).toDateString() !== new Date(msg.created_at).toDateString();
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div style={{ textAlign: 'center', margin: '10px 0' }}>
                          <span style={{ fontSize: 11, color: 'rgba(156,163,175,.4)', background: 'rgba(255,255,255,.04)', padding: '3px 12px', borderRadius: 20 }}>
                            {new Date(msg.created_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '68%' }}>
                          {!isMine && <div style={{ fontSize: 10, color: 'rgba(156,163,175,.5)', marginBottom: 3, paddingLeft: 4 }}>{msg.sender_name}</div>}
                          <div style={{
                            padding: '10px 14px',
                            borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            background: isMine ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'rgba(255,255,255,.07)',
                            fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word',
                            boxShadow: isMine ? '0 2px 12px rgba(239,68,68,.2)' : 'none',
                          }}>
                            {msg.message}
                          </div>
                          <div style={{ fontSize: 10, color: 'rgba(156,163,175,.3)', marginTop: 3, textAlign: isMine ? 'right' : 'left', paddingLeft: isMine ? 0 : 4, paddingRight: isMine ? 4 : 0 }}>
                            {fmtTime(msg.created_at)}{isMine && <span style={{ marginLeft: 4 }}>{msg.is_read ? ' ✓✓' : ' ✓'}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                  placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                  rows={1}
                  style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none', resize: 'none', maxHeight: 100, lineHeight: 1.5, fontFamily: 'inherit' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(239,68,68,.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,.1)'}
                />
                <button onClick={handleSend} disabled={!input.trim() || sending} style={{
                  width: 42, height: 42, borderRadius: 10, border: 'none', flexShrink: 0,
                  background: input.trim() ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'rgba(255,255,255,.06)',
                  color: input.trim() ? '#fff' : 'rgba(156,163,175,.3)',
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .15s',
                }}>
                  {sending ? <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} /> : <FiSend size={16} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
