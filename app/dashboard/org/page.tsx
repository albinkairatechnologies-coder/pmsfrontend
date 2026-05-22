'use client';

import { useEffect, useState } from 'react';
import { orgAPI, authAPI } from '../../utils/api';
import { FiPlus, FiTrash2, FiUsers, FiGrid, FiChevronDown, FiChevronRight, FiEdit2, FiX, FiCheck, FiEye, FiEyeOff } from 'react-icons/fi';

export default function OrgPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [tab, setTab] = useState<'chart' | 'teams' | 'departments' | 'members'>('chart');
  const [orgChart, setOrgChart] = useState<any[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());

  // Modals
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);

  const [showPassword, setShowPassword] = useState(false);

  const [teamForm, setTeamForm] = useState({ name: '', description: '' });
  const [deptForm, setDeptForm] = useState({ name: '', team_id: '', description: '' });
  const [memberForm, setMemberForm] = useState({
    name: '', email: '', password: '', role: 'employee',
    phone: '', team_id: '', department_id: '', manager_id: ''
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [t, d, m, oc] = await Promise.all([
        orgAPI.getTeams(),
        orgAPI.getDepartments(),
        orgAPI.getMembers(),
        orgAPI.getOrgChart(),
      ]);
      setTeams(t.data);
      setDepartments(d.data);
      setMembers(m.data);
      setOrgChart(oc.data);
      setExpandedTeams(new Set(oc.data.map((t: any) => t.id)));
    } catch (err) {
      console.error('Failed to load organization data', err);
    }
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    await orgAPI.createTeam(teamForm);
    setShowTeamModal(false);
    setTeamForm({ name: '', description: '' });
    loadAll();
  };

  const createDept = async (e: React.FormEvent) => {
    e.preventDefault();
    await orgAPI.createDepartment({ ...deptForm, team_id: parseInt(deptForm.team_id) || 0 });
    setShowDeptModal(false);
    setDeptForm({ name: '', team_id: '', description: '' });
    loadAll();
  };

  const handleSubmitMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMemberId) {
        const updateData: any = {
          name:          memberForm.name,
          email:         memberForm.email,
          phone:         memberForm.phone,
          role:          memberForm.role,
          team_id:       parseInt(memberForm.team_id)       || null,
          department_id: parseInt(memberForm.department_id) || null,
          manager_id:    parseInt(memberForm.manager_id)    || null
        };
        if (memberForm.password) {
          updateData.password = memberForm.password;
        }
        await authAPI.updateUser(editingMemberId, updateData);
      } else {
        await orgAPI.createMember({ ...memberForm, password: memberForm.password || 'password123' });
      }
      setShowMemberModal(false);
      setEditingMemberId(null);
      setMemberForm({ name: '', email: '', password: '', role: 'employee', phone: '', team_id: '', department_id: '', manager_id: '' });
      loadAll();
    } catch (err: any) {
      console.error('Failed to save member', err);
      alert(err?.response?.data?.error || 'Error saving member. Check if email already exists.');
    }
  };

  const startEditMember = (member: any) => {
    setEditingMemberId(member.id);
    setMemberForm({
      name: member.name || '',
      email: member.email || '',
      password: '',
      role: member.role || 'employee',
      phone: member.phone || '',
      team_id: member.team_id?.toString() || '',
      department_id: member.department_id?.toString() || '',
      manager_id: member.manager_id?.toString() || ''
    });
    setShowPassword(false);
    setShowMemberModal(true);
  };

  const deleteMember = async (id: number) => {
    if (!confirm('Delete this member?')) return;
    await orgAPI.deleteMember(id);
    loadAll();
  };

  const toggleTeam = (id: number) => {
    const next = new Set(expandedTeams);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedTeams(next);
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    bdm: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    team_lead: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    marketing_head: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    crm: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
    crm_head: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
    developer: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    smm: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    video_editor: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
    designer: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
    employee: 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-400',
  };

  const roleIcons: Record<string, string> = {
    admin: '👑',
    bdm: '💼',
    team_lead: '🛡️',
    marketing_head: '📢',
    crm_head: '🤝',
    crm: '📱',
    developer: '💻',
    smm: '📱',
    video_editor: '🎬',
    designer: '🎨',
    employee: '👥',
  };

  const getRoleTheme = (role: string) => {
    const themes: Record<string, { card: string; avatar: string; text: string; border: string }> = {
      admin: {
        card: 'bg-red-500/5 dark:bg-red-500/5 border-red-500/10 hover:border-red-500/30',
        avatar: 'bg-red-500/10 text-red-500',
        text: 'text-red-500 dark:text-red-400',
        border: 'border-red-500/20'
      },
      bdm: {
        card: 'bg-amber-500/5 dark:bg-amber-500/5 border-amber-500/10 hover:border-amber-500/30',
        avatar: 'bg-amber-500/10 text-amber-500',
        text: 'text-amber-500 dark:text-amber-400',
        border: 'border-amber-500/20'
      },
      team_lead: {
        card: 'bg-purple-500/5 dark:bg-purple-500/5 border-purple-500/10 hover:border-purple-500/30',
        avatar: 'bg-purple-500/10 text-purple-500',
        text: 'text-purple-500 dark:text-purple-400',
        border: 'border-purple-500/20'
      },
      marketing_head: {
        card: 'bg-blue-500/5 dark:bg-blue-500/5 border-blue-500/10 hover:border-blue-500/30',
        avatar: 'bg-blue-500/10 text-blue-500',
        text: 'text-blue-500 dark:text-blue-400',
        border: 'border-blue-500/20'
      },
      crm_head: {
        card: 'bg-rose-500/5 dark:bg-rose-500/5 border-rose-500/10 hover:border-rose-500/30',
        avatar: 'bg-rose-500/10 text-rose-500',
        text: 'text-rose-500 dark:text-rose-400',
        border: 'border-rose-500/20'
      },
      crm: {
        card: 'bg-pink-500/5 dark:bg-pink-500/5 border-pink-500/10 hover:border-pink-500/30',
        avatar: 'bg-pink-500/10 text-pink-500',
        text: 'text-pink-500 dark:text-pink-400',
        border: 'border-pink-500/20'
      },
      developer: {
        card: 'bg-emerald-500/5 dark:bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30',
        avatar: 'bg-emerald-500/10 text-emerald-500',
        text: 'text-emerald-500 dark:text-emerald-400',
        border: 'border-emerald-500/20'
      },
      smm: {
        card: 'bg-yellow-500/5 dark:bg-yellow-500/5 border-yellow-500/10 hover:border-yellow-500/30',
        avatar: 'bg-yellow-500/10 text-yellow-500',
        text: 'text-yellow-500 dark:text-yellow-400',
        border: 'border-yellow-500/20'
      },
      video_editor: {
        card: 'bg-violet-500/5 dark:bg-violet-500/5 border-violet-500/10 hover:border-violet-500/30',
        avatar: 'bg-violet-500/10 text-violet-500',
        text: 'text-violet-500 dark:text-violet-400',
        border: 'border-violet-500/20'
      },
      designer: {
        card: 'bg-fuchsia-500/5 dark:bg-fuchsia-500/5 border-fuchsia-500/10 hover:border-fuchsia-500/30',
        avatar: 'bg-fuchsia-500/10 text-fuchsia-500',
        text: 'text-fuchsia-500 dark:text-fuchsia-400',
        border: 'border-fuchsia-500/20'
      },
      employee: {
        card: 'bg-white dark:bg-white/3 border-gray-100 hover:border-gray-200 dark:border-white/5 dark:hover:border-white/10',
        avatar: 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400',
        text: 'text-gray-500 dark:text-gray-400',
        border: 'border-gray-200 dark:border-white/10'
      }
    };
    return themes[role] || themes.employee;
  };

  const renderLevel6Departments = () => {
    if (departments.length === 0) {
      return (
        <>
          <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
            <span className="text-lg block">💻</span>
            <span className="text-xs font-bold text-gray-800 dark:text-white block mt-1">Web Development</span>
            <span className="text-[9px] text-gray-400 block mt-0.5">Role: Developer</span>
          </div>
          <div className="p-4 bg-yellow-500/5 dark:bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
            <span className="text-lg block">📱</span>
            <span className="text-xs font-bold text-gray-800 dark:text-white block mt-1">Social Media</span>
            <span className="text-[9px] text-gray-400 block mt-0.5">Role: SMM / CRM</span>
          </div>
          <div className="p-4 bg-violet-500/5 dark:bg-violet-500/5 border border-violet-500/10 rounded-xl">
            <span className="text-lg block">🎬</span>
            <span className="text-xs font-bold text-gray-800 dark:text-white block mt-1">Video Editing</span>
            <span className="text-[9px] text-gray-400 block mt-0.5">Role: Video Editor</span>
          </div>
          <div className="p-4 bg-fuchsia-500/5 dark:bg-fuchsia-500/5 border border-fuchsia-500/10 rounded-xl">
            <span className="text-lg block">🎨</span>
            <span className="text-xs font-bold text-gray-800 dark:text-white block mt-1">Design Team</span>
            <span className="text-[9px] text-gray-400 block mt-0.5">Role: Designer</span>
          </div>
        </>
      );
    }

    return departments.map((dept) => {
      const nameLower = dept.name?.toLowerCase() || '';
      let icon = '👥';
      let roleDesc = 'Specialist';
      let themeClass = 'bg-slate-500/5 dark:bg-white/5 border-slate-500/10 dark:border-white/10 hover:border-slate-500/30 dark:hover:border-white/30 text-gray-600 dark:text-gray-400';
      
      if (nameLower.includes('web') || nameLower.includes('dev') || nameLower.includes('software')) {
        icon = '💻';
        roleDesc = 'Role: Developer';
        themeClass = 'bg-emerald-500/5 dark:bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30 text-emerald-500';
      } else if (nameLower.includes('social') || nameLower.includes('media') || nameLower.includes('smm')) {
        icon = '📱';
        roleDesc = 'Role: SMM / CRM';
        themeClass = 'bg-yellow-500/5 dark:bg-yellow-500/5 border-yellow-500/10 hover:border-yellow-500/30 text-yellow-500';
      } else if (nameLower.includes('video') || nameLower.includes('edit')) {
        icon = '🎬';
        roleDesc = 'Role: Video Editor';
        themeClass = 'bg-violet-500/5 dark:bg-violet-500/5 border-violet-500/10 hover:border-violet-500/30 text-violet-500';
      } else if (nameLower.includes('design') || nameLower.includes('art')) {
        icon = '🎨';
        roleDesc = 'Role: Designer';
        themeClass = 'bg-fuchsia-500/5 dark:bg-fuchsia-500/5 border-fuchsia-500/10 hover:border-fuchsia-500/30 text-fuchsia-500';
      }
      
      return (
        <div key={dept.id} className={`p-4 border rounded-xl transition-all hover:scale-105 duration-200 ${themeClass}`}>
          <span className="text-lg block">{icon}</span>
          <span className="text-xs font-bold text-gray-800 dark:text-white block mt-1 truncate" title={dept.name}>{dept.name}</span>
          <span className="text-[9px] text-gray-400 block mt-0.5">{roleDesc}</span>
        </div>
      );
    });
  };

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
           <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Organization</h1>
           <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Manage teams, departments, and employee hierarchies.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowTeamModal(true)} className="btn-primary flex items-center gap-2">
            <FiPlus /> Team
          </button>
          <button onClick={() => setShowDeptModal(true)} className="btn-secondary dark:bg-white/5 border-gray-200 dark:border-white/10 flex items-center gap-2">
            <FiPlus /> Dept
          </button>
          <button onClick={() => { setEditingMemberId(null); setMemberForm({ name: '', email: '', password: '', role: 'employee', phone: '', team_id: '', department_id: '', manager_id: '' }); setShowMemberModal(true); }} className="btn-gold flex items-center gap-2">
            <FiPlus /> Member
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-gray-100 dark:bg-white/5 p-1 rounded-2xl w-fit overflow-x-auto no-scrollbar">
        {(['chart', 'teams', 'departments', 'members'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${
              tab === t ? 'bg-white dark:bg-gold-500 text-primary-500 dark:text-darker shadow-lg' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >{t === 'chart' ? 'Org Chart' : t}</button>
        ))}
      </div>

      {/* Org Chart Content */}
      <div className="space-y-6">
        {tab === 'chart' && (
          <div className="bg-slate-50 dark:bg-white/3 rounded-[2.5rem] p-8 border border-gray-200/50 dark:border-white/5 mb-8">
            <h2 className="text-lg font-black uppercase tracking-widest text-gray-800 dark:text-gold-500 mb-6 text-center">Corporate Hierarchy & Structure</h2>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative">
              {/* Level 1 */}
              <div className="flex flex-col items-center p-5 bg-white dark:bg-dark-card border border-red-500/20 rounded-2xl w-full md:w-[18%] shadow-md hover:scale-105 transition-transform text-center">
                <span className="text-xl mb-1">👑</span>
                <span className="text-[10px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest">Level 1</span>
                <span className="text-md font-bold text-gray-900 dark:text-white uppercase mt-1">Admin</span>
                <p className="text-[9px] text-gray-400 mt-1">Executive Board & System Admin</p>
              </div>

              <div className="hidden md:block text-gray-300 dark:text-white/10 text-xl font-bold">➔</div>

              {/* Level 2 */}
              <div className="flex flex-col items-center p-5 bg-white dark:bg-dark-card border border-amber-500/20 rounded-2xl w-full md:w-[18%] shadow-md hover:scale-105 transition-transform text-center">
                <span className="text-xl mb-1">💼</span>
                <span className="text-[10px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-widest">Level 2</span>
                <span className="text-md font-bold text-gray-900 dark:text-white uppercase mt-1">BDM</span>
                <p className="text-[9px] text-gray-400 mt-1">Business Development Manager</p>
              </div>

              <div className="hidden md:block text-gray-300 dark:text-white/10 text-xl font-bold">➔</div>

              {/* Level 3 */}
              <div className="flex flex-col items-center p-5 bg-white dark:bg-dark-card border border-rose-500/20 rounded-2xl w-full md:w-[18%] shadow-md hover:scale-105 transition-transform text-center">
                <span className="text-xl mb-1">🤝</span>
                <span className="text-[10px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest">Level 3</span>
                <span className="text-md font-bold text-gray-900 dark:text-white uppercase mt-1">CRM / CRM Head</span>
                <p className="text-[9px] text-gray-400 mt-1">Client Relations & Retention</p>
              </div>

              <div className="hidden md:block text-gray-300 dark:text-white/10 text-xl font-bold">➔</div>

              {/* Level 4 */}
              <div className="flex flex-col items-center p-5 bg-white dark:bg-dark-card border border-blue-500/20 rounded-2xl w-full md:w-[18%] shadow-md hover:scale-105 transition-transform text-center">
                <span className="text-xl mb-1">📢</span>
                <span className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest">Level 4</span>
                <span className="text-md font-bold text-gray-900 dark:text-white uppercase mt-1">Marketing</span>
                <p className="text-[9px] text-gray-400 mt-1">SMM & Brand Management</p>
              </div>

              <div className="hidden md:block text-gray-300 dark:text-white/10 text-xl font-bold">➔</div>

              {/* Level 5 */}
              <div className="flex flex-col items-center p-5 bg-white dark:bg-dark-card border border-purple-500/20 rounded-2xl w-full md:w-[18%] shadow-md hover:scale-105 transition-transform text-center">
                <span className="text-xl mb-1">🛡️</span>
                <span className="text-[10px] font-black text-purple-500 dark:text-purple-400 uppercase tracking-widest">Level 5</span>
                <span className="text-md font-bold text-gray-900 dark:text-white uppercase mt-1">Team Leaders</span>
                <p className="text-[9px] text-gray-400 mt-1">Development & Operations Lead</p>
              </div>
            </div>

            <div className="flex items-center justify-center my-6">
              <div className="h-8 w-0.5 bg-gray-300 dark:bg-white/10"></div>
            </div>

            {/* Level 6 (Sub-types / Employees) */}
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm text-center">
              <span className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest block mb-3">Level 6 · Production & Specialization Teams</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {renderLevel6Departments()}
              </div>
            </div>
          </div>
        )}

        {tab === 'chart' && orgChart.map((team: any) => (
          <div key={team.id} className="bg-white dark:bg-dark-card rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5 shadow-xl shadow-black/5">
            <div className="flex justify-between items-center w-full group/team">
              <button onClick={() => toggleTeam(team.id)} className="flex items-center gap-6 text-left flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${expandedTeams.has(team.id) ? 'bg-indigo-600 dark:bg-gold-500 text-white dark:text-darker shadow-lg' : 'bg-gray-100 dark:bg-white/5 text-gray-400 group-hover:text-indigo-600'}`}>
                    {expandedTeams.has(team.id) ? <FiChevronDown size={24} /> : <FiChevronRight size={24} />}
                </div>
                <div className="flex-1">
                   <div className="flex items-center gap-3">
                       <FiGrid className="text-indigo-600 dark:text-gold-500" size={24} />
                       <span className="text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white">{team.name}</span>
                   </div>
                   <span className="text-xs font-black uppercase text-gray-400 tracking-widest">{team.member_count} Members</span>
                </div>
              </button>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete team "${team.name}" and all its departments?`)) {
                    orgAPI.deleteTeam(team.id).then(loadAll);
                  }
                }} 
                className="p-3 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all flex-shrink-0"
                title="Delete Team"
              >
                <FiTrash2 size={20} />
              </button>
            </div>

            {expandedTeams.has(team.id) && (
              <div className="mt-8 ml-14 space-y-8 border-l-2 border-gray-100 dark:border-white/5 pl-8">
                {team.leads?.length > 0 && (
                   <div className="space-y-3">
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Team Leadership</p>
                       <div className="flex flex-wrap gap-3">
                          {team.leads?.map((lead: any) => {
                              const theme = getRoleTheme(lead.role);
                              return (
                                <div key={lead.id} className={`flex items-center gap-4 py-3 px-5 border rounded-2xl transition-all group/lead ${theme.card}`}>
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg ${theme.avatar}`}>
                                    {roleIcons[lead.role] || '👑'}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                     <p className="font-bold text-sm text-gray-900 dark:text-white capitalize leading-none mb-1">{lead.name}</p>
                                     <p className={`text-[9px] font-black uppercase tracking-widest ${theme.text}`}>{lead.role?.replace('_', ' ')}</p>
                                  </div>
                                  <button
                                    onClick={() => startEditMember(lead)}
                                    className="opacity-0 group-hover/lead:opacity-100 p-2 bg-primary-500/10 text-primary-500 hover:bg-primary-500 hover:text-white rounded-xl transition-all flex-shrink-0"
                                    title="Edit member"
                                  >
                                    <FiEdit2 size={14} />
                                  </button>
                                </div>
                              );
                          })}
                       </div>
                   </div>
                )}

                {team.departments?.map((dept: any) => (
                  <div key={dept.id} className="space-y-4">
                    <div className="flex justify-between items-center bg-purple-500/5 dark:bg-purple-500/5 p-4 rounded-[1.5rem] border border-purple-500/10 group/dept">
                      <div className="flex items-center gap-3">
                        <FiUsers className="text-purple-500" size={20} />
                        <span className="font-black text-md uppercase tracking-tight text-purple-700 dark:text-purple-400">{dept.name}</span>
                        <span className="text-[10px] font-black bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded-md">{dept.member_count} Staff</span>
                      </div>
                      
                      <button 
                        onClick={() => {
                          if (confirm(`Delete department "${dept.name}"?`)) {
                            orgAPI.deleteDepartment(dept.id).then(loadAll);
                          }
                        }} 
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all flex-shrink-0"
                        title="Delete Department"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dept.leads?.map((lead: any) => {
                          const theme = getRoleTheme(lead.role);
                          return (
                            <div key={lead.id} className={`flex items-center gap-4 p-4 border rounded-2xl shadow-sm transition-all group/dlead ${theme.card}`}>
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg ${theme.avatar}`}>
                                {roleIcons[lead.role] || '👑'}
                              </div>
                              <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold truncate text-gray-900 dark:text-white capitalize">{lead.name}</p>
                                  <p className={`text-[9px] font-black uppercase tracking-tighter ${theme.text}`}>{lead.role?.replace('_', ' ')}</p>
                              </div>
                              <button
                                onClick={() => startEditMember(lead)}
                                className="opacity-0 group-hover/dlead:opacity-100 p-2 bg-primary-500/10 text-primary-500 hover:bg-primary-500 hover:text-white rounded-xl transition-all flex-shrink-0"
                                title="Edit member"
                              >
                                <FiEdit2 size={14} />
                              </button>
                            </div>
                          );
                      })}
                      {dept.members?.map((member: any) => {
                          const theme = getRoleTheme(member.role);
                          return (
                            <div key={member.id} className={`flex items-center gap-4 p-4 border rounded-2xl transition-all group/mem ${theme.card}`}>
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-all ${theme.avatar}`}>
                                {roleIcons[member.role] || member.name?.[0]}
                              </div>
                              <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold truncate text-gray-900 dark:text-white capitalize">{member.name}</p>
                                  <p className={`text-[9px] font-black uppercase tracking-tighter ${theme.text}`}>{member.role?.replace('_', ' ')}</p>
                              </div>
                              <button
                                onClick={() => startEditMember(member)}
                                className="opacity-0 group-hover/mem:opacity-100 p-2 bg-primary-500/10 text-primary-500 hover:bg-primary-500 hover:text-white rounded-xl transition-all flex-shrink-0"
                                title="Edit member"
                              >
                                <FiEdit2 size={14} />
                              </button>
                            </div>
                          );
                      })}
                    </div>
                  </div>
                ))}

                {team.unassigned_members?.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-indigo-500/5 dark:bg-indigo-500/5 p-4 rounded-[1.5rem] border border-indigo-500/10 group/dept">
                      <div className="flex items-center gap-3">
                        <FiUsers className="text-indigo-500" size={20} />
                        <span className="font-black text-md uppercase tracking-tight text-indigo-700 dark:text-indigo-400">General Staff / Direct Reports</span>
                        <span className="text-[10px] font-black bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-md">{team.unassigned_members.length} Staff</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {team.unassigned_members.map((member: any) => {
                          const theme = getRoleTheme(member.role);
                          return (
                            <div key={member.id} className={`flex items-center gap-4 p-4 border rounded-2xl transition-all group/mem ${theme.card}`}>
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-all ${theme.avatar}`}>
                                {roleIcons[member.role] || member.name?.[0]}
                              </div>
                              <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold truncate text-gray-900 dark:text-white capitalize">{member.name}</p>
                                  <p className={`text-[9px] font-black uppercase tracking-tighter ${theme.text}`}>{member.role?.replace('_', ' ')}</p>
                              </div>
                              <button
                                onClick={() => startEditMember(member)}
                                className="opacity-0 group-hover/mem:opacity-100 p-2 bg-primary-500/10 text-primary-500 hover:bg-primary-500 hover:text-white rounded-xl transition-all flex-shrink-0"
                                title="Edit member"
                              >
                                <FiEdit2 size={14} />
                              </button>
                            </div>
                          );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}


        {tab === 'departments' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {departments.map(dept => (
              <div key={dept.id} className="bg-white dark:bg-dark-card rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5 shadow-xl shadow-black/5 hover:translate-y-[-4px] transition-all group">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                        <FiUsers size={28} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{dept.name}</h3>
                        <p className="text-[10px] font-black uppercase text-purple-500 tracking-widest">{dept.team_name} · {dept.member_count} Members</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">{dept.description || 'Department under ' + dept.team_name}</p>
                  </div>
                  <button onClick={() => orgAPI.deleteDepartment(dept.id).then(loadAll)} className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all">
                    <FiTrash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
            {departments.length === 0 && (
              <div className="col-span-2 text-center py-20 text-gray-400 text-sm font-bold uppercase tracking-widest">No departments found.</div>
            )}
          </div>
        )}

        {tab === 'teams' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teams.map(team => (
              <div key={team.id} className="bg-white dark:bg-dark-card rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5 shadow-xl shadow-black/5 hover:translate-y-[-4px] transition-all group">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                     <div className="flex items-center gap-4 mb-4">
                         <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20 group-hover:scale-110 transition-transform">
                             <FiGrid size={28} />
                         </div>
                         <div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{team.name}</h3>
                            <p className="text-[10px] font-black uppercase text-primary-500 dark:text-gold-500 tracking-widest">{team.member_count} Members Active</p>
                         </div>
                     </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">{team.description || "Official team workspace for cross-functional collaboration and results."}</p>
                  </div>
                  <button onClick={() => orgAPI.deleteTeam(team.id).then(loadAll)} className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all">
                    <FiTrash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'members' && (
          <div className="bg-white dark:bg-dark-card rounded-[2.5rem] border border-gray-100 dark:border-white/5 overflow-hidden shadow-xl shadow-black/5">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/3">
                    {['Employee', 'Official Role', 'Assignment', 'Actions'].map(h => (
                      <th key={h} className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 dark:border-white/5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {members.map(member => (
                    <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/10 dark:to-white/5 flex flex-shrink-0 items-center justify-center text-sm font-black uppercase text-gray-500 dark:text-gray-400">
                               {member.name?.split(' ').map((n:any)=>n[0]).join('')}
                            </div>
                            <div className="min-w-0">
                               <p className="text-md font-black text-gray-900 dark:text-white capitalize truncate">{member.name}</p>
                               <p className="text-[10px] font-bold text-gray-400 truncate">{member.email}</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${roleColors[member.role] || 'bg-gray-100 text-gray-500'}`}>
                          {member.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                         <div className="space-y-1">
                            <p className="text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-tight">{member.team_name || 'Unassigned'}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{member.department_name || 'General Staff'}</p>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditMember(member)} className="p-3 bg-primary-500/10 text-primary-500 hover:bg-primary-500 hover:text-white rounded-2xl transition-all shadow-sm">
                             <FiEdit2 size={18} />
                          </button>
                          <button onClick={() => deleteMember(member.id)} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-sm">
                             <FiTrash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals with premium styling */}
      {showTeamModal && (
        <Modal title="Create Organization Team" onClose={() => setShowTeamModal(false)}>
          <form onSubmit={createTeam} className="p-8 space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-2 block">Team Name</label>
              <input value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} className="input-premium-lux" placeholder="e.g. Creative Development" required />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-2 block">General Mission / Description</label>
              <textarea value={teamForm.description} onChange={e => setTeamForm({ ...teamForm, description: e.target.value })} className="input-premium-lux h-32 resize-none" placeholder="Primary responsibilities of this team..." />
            </div>
            <button type="submit" className="w-full py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-[0.98]">Create Official Team</button>
          </form>
        </Modal>
      )}

      {showDeptModal && (
        <Modal title="Register Department" onClose={() => setShowDeptModal(false)}>
          <form onSubmit={createDept} className="p-8 space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-2 block">Department Name</label>
              <input value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} className="input-premium-lux" placeholder="e.g. UX/UI Engineering" required />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-2 block">Parent Organizational Team</label>
              <select value={deptForm.team_id} onChange={e => setDeptForm({ ...deptForm, team_id: e.target.value })} className="input-premium-lux" required>
                <option value="">Choose Parent Team...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <button type="submit" className="w-full py-5 bg-purple-600 hover:bg-purple-700 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-[0.98]">Confirm Department</button>
          </form>
        </Modal>
      )}

      {showMemberModal && (
        <Modal title={editingMemberId ? "Edit Staff Access" : "Induct New Member"} onClose={() => setShowMemberModal(false)}>
          <form onSubmit={handleSubmitMember} className="p-8 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-2 block">Legal Full Name</label>
                <input value={memberForm.name} onChange={e => setMemberForm({ ...memberForm, name: e.target.value })} className="input-premium-lux" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-2 block">Corporate Email</label>
                <input type="email" value={memberForm.email} onChange={e => setMemberForm({ ...memberForm, email: e.target.value })} className="input-premium-lux" required />
              </div>
              <div className="space-y-2 sm:col-span-2 relative">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-2 block">Access Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={memberForm.password} 
                    onChange={e => setMemberForm({ ...memberForm, password: e.target.value })} 
                    className="input-premium-lux pr-12" 
                    required={!editingMemberId} 
                    placeholder={editingMemberId ? "Leave blank to keep current password" : "Set initial password"} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500 transition-colors"
                  >
                    {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-2 block">Official Role</label>
                <select value={memberForm.role} onChange={e => setMemberForm({ ...memberForm, role: e.target.value })} className="input-premium-lux">
                  <option value="admin">System Admin</option>
                  <option value="bdm">BDM</option>
                  <option value="crm_head">CRM Head</option>
                  <option value="crm">CRM</option>
                  <option value="marketing_head">Marketing Head</option>
                  <option value="team_lead">Team Lead</option>
                  <option value="developer">Developer</option>
                  <option value="smm">Social Media</option>
                  <option value="video_editor">Video Editor</option>
                  <option value="designer">Designer</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-2 block">Assigned Team</label>
                <select value={memberForm.team_id} onChange={e => setMemberForm({ ...memberForm, team_id: e.target.value })} className="input-premium-lux">
                  <option value="">Unassigned</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-2 block">Assigned Department</label>
                <select value={memberForm.department_id} onChange={e => setMemberForm({ ...memberForm, department_id: e.target.value })} className="input-premium-lux">
                  <option value="">No Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.team_name})</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="w-full py-5 bg-primary-600 hover:bg-primary-700 dark:bg-gold-500 dark:hover:bg-gold-600 text-white dark:text-darker rounded-[2rem] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-[0.98]">
              {editingMemberId ? 'Update Corporate Profile' : 'Finalize Induction'}
            </button>
          </form>
        </Modal>
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
        .input-premium-lux {
          width: 100%;
          padding: 1.25rem 1.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 1.5rem;
          font-size: 0.95rem;
          font-weight: 700;
          transition: all 0.2s;
          outline: none;
        }
        .dark .input-premium-lux {
          background: rgba(255,255,255,0.03);
          border-color: rgba(255,255,255,0.08);
          color: white;
        }
        .input-premium-lux:focus {
          background: white;
          border-color: #6366f1;
          box-shadow: 0 0 0 6px rgba(99, 102, 241, 0.08);
        }
        .dark .input-premium-lux:focus {
          background: rgba(255,255,255,0.06);
          border-color: #F5C842;
          box-shadow: 0 0 0 6px rgba(245, 200, 66, 0.08);
        }
        .btn-primary-lux {
           background: #6366f1;
           color: white;
           font-weight: 900;
           padding: 1rem 2rem;
           border-radius: 1.5rem;
           text-transform: uppercase;
           letter-spacing: 0.1em;
           font-size: 0.75rem;
           transition: all 0.3s;
           box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.2);
        }
        .btn-primary-lux:hover {
           transform: translateY(-3px);
           box-shadow: 0 15px 30px -5px rgba(99, 102, 241, 0.4);
        }
        .dark .btn-primary-lux {
           background: #F5C842;
           color: #0F1117;
           box-shadow: 0 10px 20px -5px rgba(245, 200, 66, 0.2);
        }
        .dark .btn-primary-lux:hover {
           box-shadow: 0 15px 30px -5px rgba(245, 200, 66, 0.4);
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

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-[3rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/5 custom-scrollbar animate-slide-up relative">
        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
            <h2 className="text-xl font-bold dark:text-white uppercase tracking-tight">{title}</h2>
            <button onClick={onClose} className="p-3 text-gray-400 hover:text-red-500 transition-all"><FiX size={24} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
