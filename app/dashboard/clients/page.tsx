'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clientAPI, authAPI, proposalAPI } from '../../utils/api';
import { useAuth } from '../../utils/AuthContext';
import { FiPlus, FiSearch, FiSend, FiChevronDown, FiChevronUp, FiEye, FiCheck, FiClock, FiX, FiUser } from 'react-icons/fi';
import SendProposalModal from '../../components/SendProposalModal';

const STAGES = ['lead','onboarding','planning','design','development','marketing_execution','testing','delivery','completed'];

const STATUS_BADGE: Record<string, string> = {
  draft:    'bg-gray-100 dark:bg-gray-700 text-gray-500',
  sent:     'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  viewed:   'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
  accepted: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  rejected: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
};

const STATUS_ICON: Record<string, any> = {
  sent: FiSend, viewed: FiEye, accepted: FiCheck, rejected: FiX, draft: FiClock,
};

export default function ClientsPage() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin' || user?.role === 'marketing_head';

  const [clients, setClients]         = useState<any[]>([]);
  const [showModal, setShowModal]     = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers]             = useState<any[]>([]);
  const [expandedId, setExpandedId]   = useState<number | null>(null);
  const [proposals, setProposals]     = useState<Record<number, any[]>>({});
  const [sendTarget, setSendTarget]   = useState<any | null>(null);

  const [formData, setFormData] = useState({
    company_name: '', contact_person: '', phone: '', email: '',
    package_purchased: '', project_start_date: '', deadline: '',
    notes: '', team_members: [] as number[], total_amount: '',
  });

  useEffect(() => { loadClients(); loadUsers(); }, []);

  const loadClients = async () => {
    try { setClients((await clientAPI.getAll()).data); } catch { /* ignore */ }
  };

  const loadUsers = async () => {
    try { setUsers((await authAPI.getUsers()).data); } catch { /* ignore */ }
  };

  const loadProposals = async (clientId: number) => {
    try {
      const res = await proposalAPI.getByClient(clientId);
      setProposals(prev => ({ ...prev, [clientId]: res.data }));
    } catch { /* ignore */ }
  };

  const toggleExpand = (clientId: number) => {
    if (expandedId === clientId) {
      setExpandedId(null);
    } else {
      setExpandedId(clientId);
      loadProposals(clientId);
    }
  };

  const handleSearch = async () => {
    if (searchQuery) setClients((await clientAPI.search(searchQuery)).data);
    else loadClients();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await clientAPI.create(formData);
      setShowModal(false);
      loadClients();
      setFormData({ company_name:'', contact_person:'', phone:'', email:'',
        package_purchased:'', project_start_date:'', deadline:'', notes:'', team_members:[], total_amount:'' });
    } catch { /* ignore */ }
  };

  const handleProposalSent = () => {
    if (sendTarget) loadProposals(sendTarget.id);
  };

  const handleStageUpdate = async (clientId: number, stage: string) => {
    try {
      await clientAPI.update(clientId, { status: stage });
      loadClients();
    } catch { /* ignore */ }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">{clients.length} total clients</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary gap-2">
          <FiPlus size={16} /> Add Client
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" placeholder="Search clients..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="input pl-9" />
          </div>
          <button onClick={handleSearch} className="btn-primary">Search</button>
        </div>
      </div>

      {/* Client list */}
      <div className="space-y-4">
        {clients.map(client => (
          <div key={client.id} className="card p-0 overflow-hidden">
            {/* Client row */}
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{client.company_name}</h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400">
                      {client.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{client.contact_person}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{client.email} {client.phone ? `· ${client.phone}` : ''}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Send Proposal button — admin sees all, crm sees all (backend enforces assignment) */}
                  {(isAdmin || user?.role === 'crm_head') && (
                    <button
                      onClick={() => setSendTarget(client)}
                      className="btn-gold gap-2 text-xs py-2 px-3">
                      <FiSend size={13} /> Send Proposal
                    </button>
                  )}
                  {['admin','marketing_head','crm_head','team_lead'].includes(user?.role || '') && (
                    <Link href={`/dashboard/clients/${client.id}`}
                      className="btn-secondary gap-2 text-xs py-2 px-3 flex items-center">
                      <FiUser size={13} /> Profiles
                    </Link>
                  )}
                  <button onClick={() => toggleExpand(client.id)}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all">
                    {expandedId === client.id ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Stage pipeline */}
              <div className="flex gap-1.5 mt-4 overflow-x-auto pb-1">
                {STAGES.map(stage => (
                  <div key={stage}
                    onClick={() => isAdmin && handleStageUpdate(client.id, stage)}
                    className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap font-medium transition-all ${
                      client.status === stage
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500'
                    } ${isAdmin ? 'cursor-pointer hover:bg-primary-400 hover:text-white' : ''}`}>
                    {stage.replace(/_/g, ' ')}
                  </div>
                ))}
              </div>

              {/* Meta row */}
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-50 dark:border-gray-800">
                {[
                  { label: 'Package', val: client.package_purchased || '—' },
                  { label: 'Start',   val: client.project_start_date || '—' },
                  { label: 'Deadline',val: client.deadline || '—' },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Expanded: Proposal history */}
            {expandedId === client.id && (
              <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/2 px-5 py-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Proposal History
                </h4>
                {!proposals[client.id] ? (
                  <p className="text-sm text-gray-400">Loading...</p>
                ) : proposals[client.id].length === 0 ? (
                  <div className="flex items-center gap-3 py-3">
                    <p className="text-sm text-gray-400">No proposals sent yet.</p>
                    {(isAdmin || user?.role === 'crm_head') && (
                      <button onClick={() => setSendTarget(client)} className="btn-gold gap-1.5 text-xs py-1.5 px-3">
                        <FiSend size={12} /> Send First Proposal
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {proposals[client.id].map(p => {
                      const Icon = STATUS_ICON[p.status] || FiClock;
                      return (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${STATUS_BADGE[p.status]}`}>
                              <Icon size={14} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {p.template_name || p.project_type || 'Proposal'}
                              </p>
                              <p className="text-xs text-gray-400">
                                Sent {p.sent_at ? new Date(p.sent_at).toLocaleDateString() : '—'}
                                {p.viewed_at ? ` · Viewed ${new Date(p.viewed_at).toLocaleDateString()}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[p.status]}`}>
                              {p.status}
                            </span>
                            {p.note && (
                              <span className="text-xs text-gray-400 max-w-32 truncate" title={p.note}>
                                💬 {p.note}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Client Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box w-full max-w-2xl mx-4 p-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Add New Client</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Company Name', key: 'company_name', type: 'text', required: true },
                  { label: 'Contact Person', key: 'contact_person', type: 'text', required: true },
                  { label: 'Email', key: 'email', type: 'email', required: false },
                  { label: 'Phone', key: 'phone', type: 'text', required: false },
                  { label: 'Package', key: 'package_purchased', type: 'text', required: false },
                  { label: 'Total Contract Amount (₹)', key: 'total_amount', type: 'number', required: false },
                  { label: 'Start Date', key: 'project_start_date', type: 'date', required: false },
                  { label: 'Deadline', key: 'deadline', type: 'date', required: false },
                ].map(({ label, key, type, required }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
                    <input type={type} required={required} className="input"
                      value={(formData as any)[key]}
                      onChange={e => setFormData({ ...formData, [key]: e.target.value })} />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Team Members</label>
                <select multiple value={formData.team_members.map(String)} className="input h-28"
                  onChange={e => setFormData({ ...formData, team_members: Array.from(e.target.selectedOptions, o => parseInt(o.value)) })}>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
                <textarea className="input h-20 resize-none" value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">Create Client</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Proposal Modal */}
      {sendTarget && (
        <SendProposalModal
          client={sendTarget}
          onClose={() => setSendTarget(null)}
          onSent={handleProposalSent}
        />
      )}
    </div>
  );
}
