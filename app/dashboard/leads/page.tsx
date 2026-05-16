'use client';

import { useEffect, useState } from 'react';
import { leadsAPI, authAPI } from '../../utils/api';
import { useAuth } from '../../utils/AuthContext';
import {
  FiPlus, FiSearch, FiChevronDown, FiChevronUp,
  FiTrash2, FiEdit2, FiUserCheck, FiMessageSquare,
  FiPhone, FiMail, FiUser, FiTrendingUp, FiTarget, FiX, FiCheck, FiFilter,
  FiClock, FiCalendar
} from 'react-icons/fi';
import GlowCard from '../../components/GlowCard';

const STATUSES = ['new', 'contacted', 'follow_up', 'negotiation', 'converted', 'lost'] as const;
type LeadStatus = typeof STATUSES[number];

const STATUS_STYLE: Record<LeadStatus, string> = {
  new:         'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  contacted:   'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
  follow_up:   'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  negotiation: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400',
  converted:   'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  lost:        'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
};

const SOURCES = ['website', 'referral', 'social_media', 'cold_call', 'email_campaign', 'other'];
const SOURCE_LABEL: Record<string, string> = {
  website: 'Website', referral: 'Referral', social_media: 'Social Media',
  cold_call: 'Cold Call', email_campaign: 'Email Campaign', other: 'Other',
};

const EMPTY_FORM = {
  name: '', company: '', phone: '', email: '',
  source: 'other', service_interest: '', notes: '', assigned_to: '',
};

const EMPTY_CONVERT = {
  total_amount: '', initial_payment: '', payment_date: '',
  payment_method: 'bank_transfer', package_purchased: '',
  project_start_date: '', deadline: '', reference: '',
};

function LuxuryStatCard({ label, value, cls, onClick, active }: any) {
  return (
    <GlowCard 
      onClick={onClick}
      className={`p-4 md:p-5 cursor-pointer transition-all duration-300 border-2 ${active ? 'border-primary-500/50 dark:border-gold-500/50 ring-4 ring-primary-500/5' : 'border-transparent'}`}
    >
      <div className="flex flex-col items-center text-center space-y-1">
        <p className={`text-xl md:text-3xl font-black ${cls}`}>{value}</p>
        <p className="text-[9px] md:text-[10px] text-gray-500 dark:text-gray-400 uppercase font-black tracking-widest">{label}</p>
      </div>
      {active && (
        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-gold-500 animate-pulse" />
      )}
    </GlowCard>
  );
}

export default function LeadsPage() {
  const { user } = useAuth();
  const canDelete  = user?.role === 'admin' || user?.role === 'marketing_head';
  const canConvert = user?.role === 'admin' || user?.role === 'crm_head' || user?.role === 'marketing_head';

  const [leads, setLeads]           = useState<any[]>([]);
  const [stats, setStats]           = useState<any>({});
  const [users, setUsers]           = useState<any[]>([]);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // modals
  const [showAdd, setShowAdd]           = useState(false);
  const [editLead, setEditLead]         = useState<any>(null);
  const [followupLead, setFollowupLead] = useState<any>(null);
  const [convertLead, setConvertLead]   = useState<any>(null);
  const [activityForm, setActivityForm] = useState({
    comm_type: 'call', notes: '', status_after: '', next_followup_date: '',
    activity_date: new Date().toISOString().split('T')[0],
    activity_time: new Date().toTimeString().slice(0,5),
  });

  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [convertForm, setConvertForm]     = useState({ ...EMPTY_CONVERT });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => { load(); loadUsers(); }, []);

  const load = async () => {
    try {
      const [s, l] = await Promise.all([leadsAPI.getStats(), leadsAPI.getAll()]);
      setStats(s.data);
      setLeads(l.data);
    } catch { /* ignore */ }
  };

  const loadUsers = async () => {
    try {
      const [crm_heads, mheads] = await Promise.all([
        authAPI.getUsers({ role: 'crm_head' }),
        authAPI.getUsers({ role: 'marketing_head' }),
      ]);
      setUsers([...crm_heads.data, ...mheads.data]);
    } catch { /* ignore */ }
  };

  const filtered = leads.filter(l => {
    const matchStatus = filterStatus ? l.status === filterStatus : true;
    const q = search.toLowerCase();
    const matchSearch = !q || l.name?.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) ||
      l.phone?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const toggleExpand = async (id: number) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    // Load activities
    try {
      const res = await leadsAPI.getActivities(id);
      setLeads(prev => prev.map(l => l.id === id ? { ...l, activities: res.data.activities, status_history: res.data.status_history } : l));
    } catch {}
  };

  // ── Add / Edit ──────────────────────────────────────────────
  const openEdit = (lead: any) => {
    setForm({
      name: lead.name, company: lead.company || '', phone: lead.phone || '',
      email: lead.email || '', source: lead.source || 'other',
      service_interest: lead.service_interest || '', notes: lead.notes || '',
      assigned_to: lead.assigned_to || '',
    });
    setEditLead(lead);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, assigned_to: form.assigned_to ? parseInt(form.assigned_to) : null };
      if (editLead) {
        await leadsAPI.update(editLead.id, payload);
        setEditLead(null);
      } else {
        await leadsAPI.create(payload);
        setShowAdd(false);
      }
      setForm({ ...EMPTY_FORM });
      load();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  // ── Status quick-change ──────────────────────────────────────
  const changeStatus = async (lead: any, status: string) => {
    if (status === 'converted') return; // must use convert flow
    await leadsAPI.update(lead.id, { status });
    load();
  };

  // ── Activity ─────────────────────────────────────────────────
  const handleActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupLead) return;
    setSaving(true);
    try {
      await leadsAPI.addActivity(followupLead.id, activityForm);
      setFollowupLead(null);
      setActivityForm({
        comm_type: 'call', notes: '', status_after: '', next_followup_date: '',
        activity_date: new Date().toISOString().split('T')[0],
        activity_time: new Date().toTimeString().slice(0,5),
      });
      // Fetch fresh stats and activities in parallel for the specific lead
      const [statsRes, actRes] = await Promise.all([
        leadsAPI.getStats(),
        leadsAPI.getActivities(followupLead.id)
      ]);
      
      setStats(statsRes.data);
      setLeads(prev => prev.map(l =>
        l.id === followupLead.id
          ? { 
              ...l, 
              activities: actRes.data.activities, 
              status_history: actRes.data.status_history,
              status: activityForm.status_after || l.status 
            }
          : l
      ));
    } catch {}
    setSaving(false);
  };

  // ── Convert ──────────────────────────────────────────────────
  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertLead) return;
    if (!convertForm.total_amount || parseFloat(convertForm.total_amount) <= 0) {
      alert('Total contract amount is required to convert lead to client.');
      return;
    }
    setSaving(true);
    try {
      await leadsAPI.convert(convertLead.id, {
        ...convertForm,
        total_amount: parseFloat(convertForm.total_amount),
        initial_payment: convertForm.initial_payment ? parseFloat(convertForm.initial_payment) : 0,
      });
      setConvertLead(null);
      setConvertForm({ ...EMPTY_CONVERT });
      load();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this lead?')) return;
    await leadsAPI.delete(id);
    load();
  };

  const STAT_CARDS = [
    { label: 'Total Leads',  value: stats.total          ?? 0, cls: 'text-blue-500' },
    { label: 'New',          value: stats.new_count       ?? 0, cls: 'text-blue-400' },
    { label: 'Follow Up',    value: stats.follow_up_count ?? 0, cls: 'text-yellow-500' },
    { label: 'Negotiation',  value: stats.negotiation_count ?? 0, cls: 'text-orange-500' },
    { label: 'Converted',    value: stats.converted_count ?? 0, cls: 'text-emerald-500' },
    { label: 'Lost',         value: stats.lost_count      ?? 0, cls: 'text-red-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 animate-fade-in pb-20 pt-4 px-2 md:px-4">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white dark:bg-surface-dark p-4 md:p-6 rounded-[2rem] md:rounded-3xl border border-gray-100 dark:border-white/5 shadow-xl shadow-black/5">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-500/10 dark:bg-gold-500/10 border border-primary-500/20 dark:border-gold-500/20 rounded-xl md:rounded-2xl flex items-center justify-center text-primary-500 dark:text-gold-500 shadow-inner">
             <FiTarget size={20} className="animate-pulse" />
          </div>
          <div>
             <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-none mb-1 tracking-tight">Leads</h1>
             <p className="text-[9px] md:text-[10px] uppercase font-black text-gray-400 tracking-widest opacity-70">Prospects & Conversions</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-1 lg:max-w-3xl justify-end items-stretch sm:items-center">
           <div className="relative flex-1">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search prospects..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary-500/30 dark:focus:border-gold-500/30 rounded-2xl text-sm outline-none transition-all dark:text-white"
              />
           </div>
           
           <div className="flex gap-2">
              <div className="relative flex-1 sm:flex-none">
                <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                <select 
                  className="w-full sm:w-44 pl-9 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary-500/30 rounded-2xl text-xs font-bold outline-none appearance-none dark:text-white transition-all cursor-pointer"
                  value={filterStatus} 
                  onChange={e => setFilterStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </div>

              <button 
                  onClick={() => { setForm({ ...EMPTY_FORM }); setError(''); setShowAdd(true); }}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 dark:bg-gold-500 dark:hover:bg-gold-600 text-white dark:text-darker rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-lg shadow-primary-500/20 dark:shadow-gold-500/10 transition-all active:scale-95 whitespace-nowrap"
              >
                  <FiPlus size={18} /> Add Prospect
              </button>
           </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
        {STAT_CARDS.map(({ label, value, cls }) => (
          <LuxuryStatCard 
            key={label}
            label={label}
            value={value}
            cls={cls}
            active={filterStatus === (label === 'Total Leads' ? '' : label.toLowerCase().replace(' ', '_'))}
            onClick={() => setFilterStatus(label === 'Total Leads' ? '' : label.toLowerCase().replace(' ', '_'))}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-surface-dark rounded-3xl border border-dashed border-gray-200 dark:border-white/10 text-center py-20 md:py-32 shadow-sm">
             <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiTarget size={32} className="text-gray-200 dark:text-gray-700" />
             </div>
             <p className="text-xs md:text-sm font-black text-gray-400 uppercase tracking-[0.2em]">No prospects found</p>
          </div>
        ) : (
          filtered.map(lead => (
            <div key={lead.id} className={`bg-white dark:bg-surface-dark rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 border transition-all relative group ${expandedId === lead.id ? 'border-primary-500/30 dark:border-gold-500/30 ring-1 ring-primary-500/10 dark:ring-gold-500/10 shadow-2xl' : 'border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02]'}`}>
              
              <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center gap-3 md:gap-4 mb-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/10 dark:to-white/5 flex items-center justify-center text-gray-700 dark:text-gray-300 text-lg md:text-xl font-black uppercase border border-gray-200 dark:border-white/10 shadow-sm">
                       {lead.name?.[0] || 'L'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base md:text-lg font-black text-gray-900 dark:text-white leading-tight">{lead.name}</h3>
                        {lead.company && <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-lg">@ {lead.company}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className={`text-[9px] md:text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest border ${STATUS_STYLE[lead.status as LeadStatus]}`}>
                          {lead.status.replace('_', ' ')}
                        </span>
                        {lead.status === 'converted' && (
                          <span className="text-[9px] md:text-[10px] px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-black uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1">
                            <FiUserCheck size={11} /> Client
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                    {lead.phone && (
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/3 flex items-center justify-center text-primary-500 dark:text-gold-500"><FiPhone size={14} /></div>
                        <span className="text-[11px] md:text-xs font-bold">{lead.phone}</span>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/3 flex items-center justify-center text-primary-500 dark:text-gold-500"><FiMail size={14} /></div>
                        <span className="text-[11px] md:text-xs font-bold truncate">{lead.email}</span>
                      </div>
                    )}
                    {lead.assigned_to_name && (
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/3 flex items-center justify-center text-primary-500 dark:text-gold-500"><FiUser size={14} /></div>
                        <span className="text-[11px] md:text-xs font-bold">{lead.assigned_to_name}</span>
                      </div>
                    )}
                    {lead.service_interest && (
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/3 flex items-center justify-center text-primary-500 dark:text-gold-500"><FiTrendingUp size={14} /></div>
                        <span className="text-[11px] md:text-xs font-bold">{lead.service_interest}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{SOURCE_LABEL[lead.source] || lead.source}</span>
                    <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></span>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row lg:flex-col items-center gap-2 w-full lg:w-auto justify-between lg:justify-start border-t lg:border-t-0 pt-4 lg:pt-0 border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    {lead.status !== 'converted' && lead.status !== 'lost' && (
                      <>
                        <div className="relative group/sel">
                           <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform group-hover/sel:translate-y-[-40%]" size={12} />
                           <select
                              value={lead.status}
                              onChange={e => changeStatus(lead, e.target.value)}
                              className="text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-white/10 rounded-xl pl-4 pr-9 py-2.5 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 focus:outline-none appearance-none cursor-pointer hover:border-primary-500/30 transition-all">
                              {STATUSES.filter(s => s !== 'converted').map(s => (
                                <option key={s} value={s}>{s.replace('_', ' ')}</option>
                              ))}
                           </select>
                        </div>

                        <button onClick={() => setFollowupLead(lead)}
                          className="p-3 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 hover:bg-purple-500 hover:text-white transition-all shadow-lg shadow-purple-500/10" title="Add Follow-up">
                          <FiMessageSquare size={16} />
                        </button>

                        {canConvert && (
                          <button onClick={() => { setConvertForm({ ...EMPTY_CONVERT, package_purchased: lead.service_interest || '' }); setConvertLead(lead); }}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                            <FiUserCheck size={14} /> Convert
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(lead)}
                      className="p-3 rounded-xl bg-primary-500/10 text-primary-500 border border-primary-500/20 hover:bg-primary-500 hover:text-white transition-all">
                      <FiEdit2 size={16} />
                    </button>

                    {canDelete && (
                      <button onClick={() => handleDelete(lead.id)}
                        className="p-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">
                        <FiTrash2 size={16} />
                      </button>
                    )}

                    <button onClick={() => toggleExpand(lead.id)}
                      className={`p-3 rounded-xl transition-all ${expandedId === lead.id ? 'bg-gray-900 dark:bg-white text-white dark:text-darker' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'}`}>
                      {expandedId === lead.id ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {lead.notes && (
                <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                   <p className="text-[11px] md:text-xs text-amber-600 dark:text-amber-400 font-bold leading-relaxed">
                     <span className="mr-2">📝</span> {lead.notes}
                   </p>
                </div>
              )}

              {/* Expanded: Activity timeline */}
              {expandedId === lead.id && (
                <div className="mt-8 space-y-6 pt-8 border-t border-gray-100 dark:border-white/5 animate-slide-up">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Activity Timeline</h4>
                    <button onClick={() => setFollowupLead(lead)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-500/10 text-primary-500 hover:bg-primary-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                      <FiPlus size={12} /> Log Activity
                    </button>
                  </div>

                  {!lead.activities || lead.activities.length === 0 ? (
                    <div className="py-12 text-center bg-gray-50 dark:bg-white/2 rounded-3xl border border-dashed border-gray-100 dark:border-white/10">
                       <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No activities logged yet</p>
                    </div>
                  ) : (
                    <div className="relative pl-6 md:pl-8 border-l-2 border-gray-100 dark:border-white/5 space-y-6 md:space-y-8">
                      {lead.activities.map((a: any) => {
                        const typeColors: Record<string,string> = {
                          call: 'bg-blue-500/10 text-blue-500 border-blue-500/20', 
                          whatsapp: 'bg-green-500/10 text-green-500 border-green-500/20',
                          email: 'bg-purple-500/10 text-purple-500 border-purple-500/20', 
                          meeting: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
                          follow_up: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
                        };
                        return (
                          <div key={a.id} className="relative group/act">
                            <div className="absolute -left-[33px] md:-left-[41px] top-0 w-4 h-4 rounded-full bg-white dark:bg-surface-dark border-4 border-primary-500 shadow-sm z-10 transition-transform group-hover/act:scale-125" />
                            <div className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/5 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl shadow-black/[0.02] hover:shadow-2xl transition-all">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${typeColors[a.comm_type] || 'bg-gray-100 text-gray-500'}`}>
                                    {a.comm_type.replace('_',' ')}
                                  </span>
                                  {a.status_after && (
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${STATUS_STYLE[a.status_after as LeadStatus] || 'bg-gray-100 text-gray-500'}`}>
                                      → {a.status_after.replace('_',' ')}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-gray-400">
                                   <FiClock size={12} />
                                   <span className="text-[10px] font-black uppercase tracking-widest">
                                     {new Date(a.activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {a.activity_time?.slice(0,5)}
                                   </span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{a.notes}</p>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-6 pt-4 border-t border-gray-50 dark:border-white/5">
                                <div className="flex items-center gap-2">
                                   <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-[10px] font-black text-gray-400 uppercase">{a.user_name?.[0]}</div>
                                   <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{a.user_name}</span>
                                </div>
                                {a.next_followup_date && (
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
                                    <FiCalendar className="text-yellow-600 dark:text-yellow-500" size={12} />
                                    <span className="text-[10px] font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-widest">Next Follow-up: {new Date(a.next_followup_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Lead Modal */}
      {(showAdd || editLead) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white dark:bg-surface-dark w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border border-white/10 shadow-2xl animate-slide-up custom-scrollbar">
            <div className="p-6 md:p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center">
                    <FiUser size={20} />
                 </div>
                 <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{editLead ? 'Edit Prospect' : 'New Prospect'}</h2>
              </div>
              <button onClick={() => { setShowAdd(false); setEditLead(null); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><FiX size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6">
              {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-2xl animate-shake">{error}</div>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name *</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} 
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary-500/30 rounded-2xl outline-none text-sm font-bold transition-all dark:text-white" placeholder="John Doe" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Company</label>
                  <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary-500/30 rounded-2xl outline-none text-sm font-bold transition-all dark:text-white" placeholder="Company Name" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary-500/30 rounded-2xl outline-none text-sm font-bold transition-all dark:text-white" placeholder="john@example.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary-500/30 rounded-2xl outline-none text-sm font-bold transition-all dark:text-white" placeholder="+91 ..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Lead Source</label>
                  <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary-500/30 rounded-2xl outline-none text-sm font-bold transition-all dark:text-white appearance-none cursor-pointer">
                    {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABEL[s] || s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Service Interest</label>
                  <input value={form.service_interest} onChange={e => setForm({ ...form, service_interest: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary-500/30 rounded-2xl outline-none text-sm font-bold transition-all dark:text-white" placeholder="SEO, Web Design, etc." />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Notes / Requirements</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary-500/30 rounded-2xl outline-none text-sm font-bold transition-all dark:text-white h-28 resize-none" placeholder="Enter any specific requirements..." />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setShowAdd(false); setEditLead(null); }}
                  className="flex-1 py-4 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-white/10 transition-all active:scale-95">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-[2] py-4 bg-primary-600 dark:bg-gold-500 text-white dark:text-darker rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary-500/20 dark:shadow-gold-500/10 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50">
                  {saving ? 'Processing...' : editLead ? 'Update Prospect' : 'Create Prospect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Activity Modal */}
      {followupLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[2.5rem] border border-white/10 shadow-2xl animate-slide-up p-8">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                     <FiMessageSquare size={20} />
                  </div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">Log Activity</h2>
               </div>
               <button onClick={() => setFollowupLead(null)} className="p-2 text-gray-400 hover:text-red-500 rounded-xl"><FiX size={20} /></button>
            </div>

            <form onSubmit={handleActivity} className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Comm Type</label>
                    <select value={activityForm.comm_type} onChange={e => setActivityForm({ ...activityForm, comm_type: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-purple-500/30 rounded-2xl outline-none text-xs font-bold dark:text-white appearance-none cursor-pointer">
                      <option value="call">Call</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Email</option>
                      <option value="meeting">Meeting</option>
                      <option value="follow_up">Follow Up</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Status</label>
                    <select value={activityForm.status_after} onChange={e => setActivityForm({ ...activityForm, status_after: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-purple-500/30 rounded-2xl outline-none text-xs font-bold dark:text-white appearance-none cursor-pointer">
                      <option value="">No Change</option>
                      {STATUSES.filter(s => s !== 'converted').map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </div>
               </div>

               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Activity Date</label>
                  <input type="date" value={activityForm.activity_date} onChange={e => setActivityForm({ ...activityForm, activity_date: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-purple-500/30 rounded-2xl outline-none text-sm font-bold dark:text-white" />
               </div>

               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Conversation Notes</label>
                  <textarea required value={activityForm.notes} onChange={e => setActivityForm({ ...activityForm, notes: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-purple-500/30 rounded-2xl outline-none text-sm font-bold dark:text-white h-24 resize-none" placeholder="What did you discuss?" />
               </div>

               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Next Follow-up</label>
                  <input type="date" value={activityForm.next_followup_date} onChange={e => setActivityForm({ ...activityForm, next_followup_date: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-purple-500/30 rounded-2xl outline-none text-sm font-bold dark:text-white" />
               </div>

               <button type="submit" disabled={saving}
                 className="w-full py-4 bg-purple-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 hover:bg-purple-600 transition-all active:scale-95 disabled:opacity-50">
                 {saving ? 'Logging...' : 'Save Activity'}
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Client Modal */}
      {convertLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white dark:bg-surface-dark w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border border-white/10 shadow-2xl animate-slide-up custom-scrollbar">
            <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md z-10">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                     <FiUserCheck size={20} />
                  </div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">Convert to Client</h2>
               </div>
               <button onClick={() => setConvertLead(null)} className="p-2 text-gray-400 hover:text-red-500 rounded-xl"><FiX size={20} /></button>
            </div>

            <div className="p-8 space-y-6">
               <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-sm">{convertLead.name[0]}</div>
                  <div>
                     <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Ready to onboard</p>
                     <p className="text-sm font-bold text-gray-900 dark:text-white">{convertLead.name}</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contract Amount (Total) *</label>
                    <input type="number" required value={convertForm.total_amount} onChange={e => setConvertForm({ ...convertForm, total_amount: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-emerald-500/30 rounded-2xl outline-none text-sm font-bold dark:text-white" placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Initial Payment *</label>
                    <input type="number" required value={convertForm.initial_payment} onChange={e => setConvertForm({ ...convertForm, initial_payment: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-emerald-500/30 rounded-2xl outline-none text-sm font-bold dark:text-white" placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Method</label>
                    <select value={convertForm.payment_method} onChange={e => setConvertForm({ ...convertForm, payment_method: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-emerald-500/30 rounded-2xl outline-none text-xs font-bold dark:text-white appearance-none cursor-pointer">
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI / Online</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Package / Service</label>
                    <input value={convertForm.package_purchased} onChange={e => setConvertForm({ ...convertForm, package_purchased: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-emerald-500/30 rounded-2xl outline-none text-sm font-bold dark:text-white" placeholder="Selected Package" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Project Start Date</label>
                    <input type="date" value={convertForm.project_start_date} onChange={e => setConvertForm({ ...convertForm, project_start_date: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-emerald-500/30 rounded-2xl outline-none text-sm font-bold dark:text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Final Deadline</label>
                    <input type="date" value={convertForm.deadline} onChange={e => setConvertForm({ ...convertForm, deadline: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-emerald-500/30 rounded-2xl outline-none text-sm font-bold dark:text-white" />
                  </div>
               </div>

               <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setConvertLead(null)}
                    className="flex-1 py-4 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-white/10 transition-all active:scale-95">
                    Cancel
                  </button>
                  <button onClick={handleConvert} disabled={saving}
                    className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50">
                    {saving ? 'Converting...' : 'Finalize Onboarding'}
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
