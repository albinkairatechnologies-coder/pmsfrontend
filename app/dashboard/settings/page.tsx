'use client';

import { useEffect, useState } from 'react';
import { companyAPI } from '../../utils/api';
import { FiSave, FiSettings, FiShield, FiBriefcase, FiCheck } from 'react-icons/fi';

const ALL_ROLES = [
  { value: 'admin', label: 'System Admin' },
  { value: 'bdm_head', label: 'BDM Head' },
  { value: 'bdm', label: 'BDM' },
  { value: 'marketing_head', label: 'Marketing Head' },
  { value: 'crm_head', label: 'CRM Head' },
  { value: 'crm', label: 'CRM' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'developer', label: 'Developer' },
  { value: 'smm', label: 'Social Media' },
  { value: 'video_editor', label: 'Video Editor' },
  { value: 'designer', label: 'Designer' },
  { value: 'employee', label: 'Employee' },
];

const SECTIONS = [
  { key: 'dashboard', label: 'Dashboard Page' },
  { key: 'announcements', label: 'Announcements Section' },
  { key: 'attendance', label: 'Attendance Tracking' },
  { key: 'clients', label: 'Clients Management' },
  { key: 'invoices', label: 'Invoices Generation' },
  { key: 'documents', label: 'Documents Store' },
  { key: 'domains', label: 'Domains & Alerts' },
  { key: 'eod', label: 'EOD (End of Day) Reports' },
  { key: 'feedback', label: 'Feedback & Ratings' },
  { key: 'finance', label: 'Finance & Payments' },
  { key: 'gdrive', label: 'Google Drive Integration' },
  { key: 'analytics', label: 'HR & Work Analytics' },
  { key: 'leaves', label: 'Leaves Management' },
  { key: 'leads', label: 'Leads & Marketing' },
  { key: 'activity', label: 'Live Monitor (Activity)' },
  { key: 'chat', label: 'Messenger (Chat)' },
  { key: 'permissions', label: 'Permissions Management' },
  { key: 'reports', label: 'PDF Reports Centre' },
  { key: 'salary', label: 'Salary & Coin Rewards' },
  { key: 'tasks', label: 'Tasks & Projects Pipeline' },
  { key: 'worklogs', label: 'Work Logs Submit & Approve' },
];

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  dashboard: ['admin', 'bdm_head', 'bdm', 'marketing_head', 'developer', 'smm', 'video_editor', 'designer', 'crm_head', 'crm', 'client', 'team_lead', 'employee'],
  announcements: ['admin', 'bdm_head', 'bdm', 'marketing_head', 'developer', 'smm', 'video_editor', 'designer', 'crm_head', 'crm', 'client', 'team_lead', 'employee'],
  attendance: ['admin', 'bdm_head', 'bdm', 'marketing_head', 'developer', 'smm', 'video_editor', 'designer', 'crm_head', 'crm', 'team_lead', 'employee'],
  clients: ['admin', 'bdm_head', 'bdm', 'crm_head', 'marketing_head', 'team_lead'],
  invoices: ['admin', 'bdm_head', 'bdm', 'crm_head', 'marketing_head'],
  documents: ['admin', 'bdm_head', 'bdm', 'marketing_head', 'developer', 'smm', 'video_editor', 'designer', 'crm_head', 'crm', 'team_lead', 'employee'],
  domains: ['admin', 'bdm_head', 'bdm', 'crm_head', 'marketing_head', 'team_lead'],
  eod: ['admin', 'bdm_head', 'bdm', 'marketing_head', 'developer', 'smm', 'video_editor', 'designer', 'crm_head', 'crm', 'team_lead', 'employee'],
  feedback: ['admin', 'bdm_head', 'bdm', 'marketing_head', 'developer', 'smm', 'video_editor', 'designer', 'crm_head', 'crm', 'team_lead', 'employee'],
  finance: ['admin', 'bdm_head', 'bdm', 'crm_head', 'marketing_head'],
  gdrive: ['admin', 'bdm_head', 'bdm', 'marketing_head', 'developer', 'smm', 'video_editor', 'designer', 'crm_head', 'crm', 'team_lead', 'employee'],
  analytics: ['admin', 'bdm_head', 'bdm', 'marketing_head', 'crm_head', 'team_lead'],
  leaves: ['admin', 'bdm_head', 'bdm', 'marketing_head', 'developer', 'smm', 'video_editor', 'designer', 'crm_head', 'crm', 'team_lead', 'employee'],
  leads: ['admin', 'bdm_head', 'bdm', 'crm_head', 'marketing_head', 'smm', 'crm'],
  activity: ['admin', 'bdm_head', 'bdm', 'marketing_head'],
  chat: ['admin', 'bdm_head', 'bdm', 'marketing_head', 'developer', 'smm', 'video_editor', 'designer', 'crm_head', 'crm', 'client', 'team_lead', 'employee'],
  permissions: ['admin', 'bdm_head', 'bdm', 'marketing_head', 'developer', 'smm', 'video_editor', 'designer', 'crm_head', 'crm', 'team_lead', 'employee'],
  reports: ['admin', 'bdm_head', 'bdm', 'marketing_head', 'crm_head', 'team_lead'],
  salary: ['admin', 'bdm_head', 'bdm', 'marketing_head'],
  tasks: ['admin', 'bdm_head', 'bdm', 'marketing_head', 'developer', 'smm', 'video_editor', 'designer', 'crm_head', 'crm', 'team_lead', 'employee'],
  worklogs: ['admin', 'bdm_head', 'bdm', 'marketing_head', 'developer', 'smm', 'video_editor', 'designer', 'crm_head', 'crm', 'team_lead', 'employee'],
};

export default function CompanySettingsPage() {
  const [tab, setTab] = useState<'general' | 'permissions'>('general');
  const [form, setForm] = useState({
    company_name: '', company_address: '', company_phone: '',
    company_email: '', company_website: '', company_logo_path: '',
  });
  const [permissions, setPermissions] = useState<Record<string, string[]>>(DEFAULT_ROLE_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    companyAPI.getLetterhead()
      .then(r => {
        setForm({
          company_name: r.data.company_name || '',
          company_address: r.data.company_address || '',
          company_phone: r.data.company_phone || '',
          company_email: r.data.company_email || '',
          company_website: r.data.company_website || '',
          company_logo_path: r.data.company_logo_path || '',
        });
        if (r.data.role_permissions) {
          try {
            const parsed = typeof r.data.role_permissions === 'string'
              ? JSON.parse(r.data.role_permissions)
              : r.data.role_permissions;
            setPermissions(parsed);
          } catch(e) {
            console.error('Failed to parse database permissions:', e);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load settings:', err);
        setError('Failed to fetch configurations.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setError('');
    try {
      const payload = {
        ...form,
        role_permissions: JSON.stringify(permissions)
      };
      await companyAPI.updateLetterhead(payload);
      
      // Update local cache instantly
      localStorage.setItem('role_permissions', JSON.stringify(permissions));
      
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || 'Failed to update company settings.');
    }
  };

  const handleCheckboxChange = (sectionKey: string, roleValue: string, checked: boolean) => {
    setPermissions(prev => {
      const current = prev[sectionKey] ? [...prev[sectionKey]] : [];
      if (checked) {
        if (!current.includes(roleValue)) current.push(roleValue);
      } else {
        // Prevent removing admin access to ensure admins never lock themselves out
        if (roleValue === 'admin') return prev;
        return {
          ...prev,
          [sectionKey]: current.filter(r => r !== roleValue)
        };
      }
      return {
        ...prev,
        [sectionKey]: current
      };
    });
  };

  const fields = [
    { key: 'company_name', label: 'Company Name', type: 'text', placeholder: 'e.g. Kaira Flow Ltd' },
    { key: 'company_address', label: 'Headquarters Address', type: 'text', placeholder: 'e.g. 123 Corporate Road, Suite A' },
    { key: 'company_phone', label: 'Official Phone Number', type: 'text', placeholder: 'e.g. +91 98765 43210' },
    { key: 'company_email', label: 'Corporate Support Email', type: 'email', placeholder: 'e.g. info@kairavcard.com' },
    { key: 'company_website', label: 'Official Website', type: 'text', placeholder: 'e.g. www.kairavcard.com' },
    { key: 'company_logo_path', label: 'Logo Server File Path', type: 'text', placeholder: 'e.g. uploads/logo.png' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <span className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
        <p className="text-xs uppercase tracking-widest font-black text-gray-400">Loading Configuration System...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-shimmer uppercase tracking-tighter">System Administration</h1>
          <p className="text-gray-500 text-sm">Configure system details, letterhead values, and manage role-based page permissions.</p>
        </div>
        {saved && (
          <div className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-xs font-bold border border-emerald-500/20 animate-fade-in">
            ✓ Settings updated & cached successfully!
          </div>
        )}
        {error && (
          <div className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold border border-red-500/20">
            ⚠ {error}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 dark:bg-white/5 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setTab('general')}
          className={`flex items-center gap-2 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${
            tab === 'general' ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-md' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <FiBriefcase size={12} /> General & Letterhead
        </button>
        <button
          onClick={() => setTab('permissions')}
          className={`flex items-center gap-2 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${
            tab === 'permissions' ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-md' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <FiShield size={12} /> Section Access Control
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {tab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form column */}
            <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-xl space-y-5">
              <h3 className="text-base font-bold flex items-center gap-2 dark:text-white mb-2">
                <FiSettings className="text-indigo-500 animate-spin-slow" /> Brand & PDF Config
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map(f => (
                  <div key={f.key} className={f.key === 'company_address' ? 'md:col-span-2' : ''}>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">{f.label}</label>
                    <input
                      type={f.type}
                      value={(form as any)[f.key] || ''}
                      placeholder={f.placeholder}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 outline-none transition dark:text-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Column */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-3xl p-6 border border-indigo-500/10 shadow-xl">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 block mb-3">Live Report Preview</span>
                {form.company_name ? (
                  <div className="p-5 bg-white dark:bg-dark-card border border-gray-100 dark:border-white/5 rounded-2xl shadow-md">
                    <p className="font-black text-lg text-gray-900 dark:text-white capitalize tracking-tight">{form.company_name}</p>
                    {form.company_address && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{form.company_address}</p>}
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex flex-wrap gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                      {form.company_phone && <span>📞 {form.company_phone}</span>}
                      {form.company_email && <span>✉ {form.company_email}</span>}
                      {form.company_website && <span>🌐 {form.company_website}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-xs text-gray-400 font-bold uppercase tracking-wider">
                    Enter company name to see letterhead layout preview
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'permissions' && (
          <div className="bg-white dark:bg-dark-card rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 dark:text-white">
                  <FiShield className="text-rose-500" /> Interactive Access Permissions Grid
                </h3>
                <p className="text-gray-400 text-xs mt-1">Configure which roles are allowed to access and view each section in the navigation menu.</p>
              </div>
              <span className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[9px] font-black uppercase tracking-wider">
                👑 Admin ALWAYS HAS FULL ACCESS
              </span>
            </div>

            {/* Grid Table */}
            <div className="overflow-x-auto custom-scrollbar border border-gray-100 dark:border-white/5 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/3 border-b border-gray-100 dark:border-white/5">
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400 min-w-[200px]">Navigation Session / Page</th>
                    {ALL_ROLES.map(role => (
                      <th key={role.value} className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center min-w-[100px] border-l border-gray-100 dark:border-white/5">
                        {role.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {SECTIONS.map(section => (
                    <tr key={section.key} className="hover:bg-slate-500/5 dark:hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-xs text-gray-800 dark:text-gray-200">
                        {section.label}
                      </td>
                      {ALL_ROLES.map(role => {
                        const isAllowed = permissions[section.key]?.includes(role.value) || role.value === 'admin';
                        const isAdminCell = role.value === 'admin';
                        return (
                          <td key={role.value} className="p-4 text-center border-l border-gray-100 dark:border-white/5">
                            <label className="relative inline-flex items-center justify-center cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={isAllowed}
                                disabled={isAdminCell}
                                onChange={e => handleCheckboxChange(section.key, role.value, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                isAllowed
                                  ? 'bg-indigo-500/20 text-indigo-500 dark:bg-gold-500/20 dark:text-gold peer-checked:scale-[1.08]'
                                  : 'bg-gray-100 text-gray-300 dark:bg-white/5 dark:text-white/10 group-hover:bg-gray-200 dark:group-hover:bg-white/10'
                              } ${isAdminCell ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {isAllowed ? <FiCheck size={14} className="stroke-[3]" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                              </div>
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Save Action */}
        <button
          type="submit"
          className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
        >
          <FiSave size={14} />
          <span>Save System Configurations</span>
        </button>
      </form>

      <style jsx global>{`
        .text-shimmer {
          background: linear-gradient(90deg, #6366f1, #a855f7, #6366f1);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 5s linear infinite;
        }
        @keyframes shimmer { to { background-position: 200% center; } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
