'use client';

import { useEffect, useState } from 'react';
import { workLogAPI, clientAPI, taskAPI, authAPI, leadsAPI } from '../../utils/api';
import { useAuth } from '../../utils/AuthContext';
import { FiPlus, FiCheck, FiX, FiClock, FiFilter } from 'react-icons/fi';

const DEPARTMENTS = ['Marketing', 'Social Media Marketing', 'Web Development', 'Video Editing', 'CRM', 'General'];
const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  on_hold: 'bg-gray-100 text-gray-600',
};

function calcDuration(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
}

export default function WorkLogsPage() {
  const { user } = useAuth();
  const isLead = ['admin', 'team_lead', 'marketing_head', 'crm_head'].includes(user?.role || '');

  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'team'>('my');

  // Filters
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  const [formData, setFormData] = useState({
    client_id: '', lead_id: '', task_id: '', work_description: '',
    hours_worked: '', log_date: new Date().toISOString().split('T')[0],
    start_time: '', end_time: '', department: '', status: 'completed',
  });

  const duration = calcDuration(formData.start_time, formData.end_time);

  useEffect(() => {
    loadClients();
    if (isLead) { loadEmployees(); loadLeads(); }
    loadLogs();
  }, [activeTab]);

  const loadLogs = async () => {
    try {
      if (activeTab === 'team' && isLead) {
        const res = await workLogAPI.getTeam({
          employee_id: filterEmployee || undefined,
          client_id: filterClient || undefined,
          status: filterStatus || undefined,
          start_date: filterStart || undefined,
          end_date: filterEnd || undefined,
        });
        setWorkLogs(res.data);
      } else {
        const res = await workLogAPI.getAll();
        setWorkLogs(res.data);
      }
    } catch (e) { console.error(e); }
  };

  const loadClients = async () => {
    try { const r = await clientAPI.getAll(); setClients(r.data); } catch {}
  };

  const loadLeads = async () => {
    try { const r = await leadsAPI.getAll(); setLeads(r.data); } catch {}
  };

  const loadEmployees = async () => {
    try { const r = await authAPI.getUsers(); setEmployees(r.data); } catch {}
  };

  const loadTasks = async (clientId?: string) => {
    try {
      // Always load all user-accessible tasks regardless of client
      const r = await taskAPI.getAll();
      setTasks(r.data);
    } catch {}
  };

  useEffect(() => { loadTasks(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        ...formData,
        client_id: formData.client_id || null,
        lead_id: formData.lead_id || null,
        task_id: formData.task_id || null,
        duration_minutes: duration || null,
        hours_worked: formData.hours_worked || (duration ? (duration / 60).toFixed(2) : '0'),
      };
      await workLogAPI.create(payload);
      setShowModal(false);
      setFormData({
        client_id: '', lead_id: '', task_id: '', work_description: '',
        hours_worked: '', log_date: new Date().toISOString().split('T')[0],
        start_time: '', end_time: '', department: '', status: 'completed',
      });
      loadLogs();
    } catch (e) { console.error(e); }
  };

  const handleApprove = async (id: number) => {
    await workLogAPI.approve(id); loadLogs();
  };
  const handleReject = async (id: number) => {
    await workLogAPI.reject(id); loadLogs();
  };

  const totalHours = workLogs.reduce((s, l) => s + parseFloat(l.hours_worked || 0), 0);
  const totalMins = workLogs.reduce((s, l) => s + (l.duration_minutes || 0), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white">Work Logs</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <FiPlus /> Log Work
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="card">
          <p className="text-sm text-gray-500">Total Logs</p>
          <p className="text-3xl font-bold mt-1">{workLogs.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Hours</p>
          <p className="text-3xl font-bold mt-1">{totalHours.toFixed(1)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Duration</p>
          <p className="text-3xl font-bold mt-1">{Math.floor(totalMins / 60)}h {totalMins % 60}m</p>
        </div>
      </div>

      {/* Tabs for lead */}
      {isLead && (
        <div className="flex gap-2 mb-4">
          {(['my', 'team'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === tab ? 'bg-primary text-white' : 'btn-secondary'}`}>
              {tab === 'my' ? 'My Logs' : 'Team Logs'}
            </button>
          ))}
        </div>
      )}

      {/* Team filters */}
      {activeTab === 'team' && isLead && (
        <div className="card mb-4">
          <div className="grid grid-cols-5 gap-3">
            <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="input">
              <option value="">All Employees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="input">
              <option value="">All Clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input">
              <option value="">All Status</option>
              {['completed', 'approved', 'rejected', 'in_progress', 'on_hold'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="input" placeholder="From" />
            <div className="flex gap-2">
              <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="input" />
              <button onClick={loadLogs} className="btn-primary px-3"><FiFilter /></button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-3 py-3 text-left">Date</th>
              {activeTab === 'team' && <th className="px-3 py-3 text-left">Employee</th>}
              <th className="px-3 py-3 text-left">Client</th>
              <th className="px-3 py-3 text-left">Task</th>
              <th className="px-3 py-3 text-left">Department</th>
              <th className="px-3 py-3 text-left">Description</th>
              <th className="px-3 py-3 text-center">Start</th>
              <th className="px-3 py-3 text-center">End</th>
              <th className="px-3 py-3 text-center">Duration</th>
              <th className="px-3 py-3 text-center">Hours</th>
              <th className="px-3 py-3 text-center">Status</th>
              {activeTab === 'team' && isLead && <th className="px-3 py-3 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {workLogs.map((log, idx) => (
              <tr key={idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                <td className="px-3 py-3 whitespace-nowrap">{log.log_date || log.work_date}</td>
                {activeTab === 'team' && <td className="px-3 py-3">{log.user_name}</td>}
                <td className="px-3 py-3">{log.company_name || log.lead_name || '-'}</td>
                <td className="px-3 py-3">{log.task_title || '-'}</td>
                <td className="px-3 py-3">{log.department_name || log.department || '-'}</td>
                <td className="px-3 py-3 max-w-xs truncate">{log.work_description}</td>
                <td className="px-3 py-3 text-center">{log.start_time ? String(log.start_time).slice(0, 5) : '-'}</td>
                <td className="px-3 py-3 text-center">{log.end_time ? String(log.end_time).slice(0, 5) : '-'}</td>
                <td className="px-3 py-3 text-center">
                  {log.duration_minutes ? `${Math.floor(log.duration_minutes / 60)}h ${log.duration_minutes % 60}m` : '-'}
                </td>
                <td className="px-3 py-3 text-center font-semibold">{parseFloat(log.hours_worked || 0).toFixed(1)}</td>
                <td className="px-3 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[log.status] || STATUS_COLORS.completed}`}>
                    {log.status || 'completed'}
                  </span>
                </td>
                {activeTab === 'team' && isLead && (
                  <td className="px-3 py-3 text-center">
                    {log.status !== 'approved' && log.status !== 'rejected' && (
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => handleApprove(log.id)}
                          className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200" title="Approve">
                          <FiCheck size={14} />
                        </button>
                        <button onClick={() => handleReject(log.id)}
                          className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200" title="Reject">
                          <FiX size={14} />
                        </button>
                      </div>
                    )}
                    {log.status === 'approved' && <span className="text-xs text-green-600">✓ {log.approved_by_name}</span>}
                    {log.status === 'rejected' && <span className="text-xs text-red-600">✗ {log.approved_by_name}</span>}
                  </td>
                )}
              </tr>
            ))}
            {workLogs.length === 0 && (
              <tr><td colSpan={12} className="px-4 py-8 text-center text-gray-400">No work logs found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Log Work Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Log Work</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Client / Lead</label>
                  <select
                    value={formData.client_id ? `c_${formData.client_id}` : formData.lead_id ? `l_${formData.lead_id}` : ''}
                    onChange={e => {
                      const val = e.target.value;
                      if (val.startsWith('c_')) {
                        setFormData({ ...formData, client_id: val.slice(2), lead_id: '', task_id: '' });
                        loadTasks(val.slice(2));
                      } else if (val.startsWith('l_')) {
                        setFormData({ ...formData, lead_id: val.slice(2), client_id: '', task_id: '' });
                      } else {
                        setFormData({ ...formData, client_id: '', lead_id: '', task_id: '' });
                      }
                    }}
                    className="input" required>
                    <option value="">Select Client / Lead</option>
                    <optgroup label="── Clients ──">
                      {clients.map(c => <option key={`c_${c.id}`} value={`c_${c.id}`}>{c.company_name}</option>)}
                    </optgroup>
                    {isLead && leads.length > 0 && (
                      <optgroup label="── Leads ──">
                        {leads.map(l => <option key={`l_${l.id}`} value={`l_${l.id}`}>{l.name}{l.company ? ` (${l.company})` : ''}</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Task (Optional)</label>
                  <select value={formData.task_id}
                    onChange={e => setFormData({ ...formData, task_id: e.target.value })}
                    className="input">
                    <option value="">Select Task</option>
                    {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <select value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    className="input">
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Work Date</label>
                  <input type="date" value={formData.log_date}
                    onChange={e => setFormData({ ...formData, log_date: e.target.value })}
                    className="input" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input type="time" value={formData.start_time}
                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                    className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input type="time" value={formData.end_time}
                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                    className="input" />
                </div>
              </div>

              {duration > 0 && (
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded">
                  <FiClock size={14} />
                  Duration: {Math.floor(duration / 60)}h {duration % 60}m
                  ({(duration / 60).toFixed(2)} hrs)
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Hours Worked</label>
                  <input type="number" step="0.25" value={formData.hours_worked}
                    onChange={e => setFormData({ ...formData, hours_worked: e.target.value })}
                    placeholder={duration ? (duration / 60).toFixed(2) : '0'}
                    className="input" />
                  <p className="text-xs text-gray-400 mt-1">Leave blank to auto-fill from time</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="input">
                    <option value="completed">Completed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Work Description</label>
                <textarea value={formData.work_description}
                  onChange={e => setFormData({ ...formData, work_description: e.target.value })}
                  className="input h-24" placeholder="Describe what you worked on..." required />
              </div>

              <div className="flex gap-4">
                <button type="submit" className="btn-primary flex-1">Submit Log</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
