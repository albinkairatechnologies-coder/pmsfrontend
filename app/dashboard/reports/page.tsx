'use client';

import { useEffect, useState, useRef } from 'react';
import { reportsAPI, clientAPI, authAPI } from '../../utils/api';
import { FiPrinter, FiFileText } from 'react-icons/fi';

const DEPARTMENTS = ['Marketing', 'Social Media Marketing', 'Web Development', 'Video Editing', 'CRM', 'General'];

const REPORT_TYPES = [
  { value: 'client', label: 'Client Work Summary' },
  { value: 'department', label: 'Department Summary' },
  { value: 'employee', label: 'Employee Summary' },
  { value: 'full', label: 'Full Company Report' },
];

const COL_MAPS: Record<string, string[]> = {
  client: ['user_name', 'department_name', 'task_title', 'log_date', 'hours_worked', 'status'],
  department: ['department', 'employee_name', 'task_title', 'work_date', 'hours_worked', 'status'],
  employee: ['log_date', 'company_name', 'task_title', 'department_name', 'hours_worked', 'status'],
  full: ['team_name', 'department_name', 'user_name', 'company_name', 'task_title', 'log_date', 'hours_worked', 'status'],
};

const COL_LABELS: Record<string, string> = {
  user_name: 'Employee', department_name: 'Department', task_title: 'Task',
  log_date: 'Date', work_date: 'Date', start_time: 'Start', end_time: 'End',
  duration_minutes: 'Duration', hours_worked: 'Hours', status: 'Status',
  company_name: 'Client', team_name: 'Team', employee_name: 'Employee', department: 'Department',
};

function fmtDuration(mins: any) {
  if (!mins) return '-';
  const m = parseInt(mins);
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmtTime(t: any) {
  if (t === null || t === undefined || t === '' || t === '00:00') return '-';
  return String(t).slice(0, 5);
}

function cellVal(col: string, val: any) {
  if (col === 'duration_minutes') return fmtDuration(val);
  if (col === 'start_time' || col === 'end_time') return fmtTime(val);
  if (val === null || val === undefined || val === '') return '-';
  return val;
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState('client');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clientAPI.getAll().then(r => setClients(r.data)).catch(() => {});
    authAPI.getUsers().then(r => setEmployees(r.data)).catch(() => {});
  }, []);

  const generateReport = async () => {
    if (!startDate || !endDate) { alert('Please select date range'); return; }
    setLoading(true);
    setError('');
    setReportData([]);
    try {
      let rows: any[] = [];
      if (reportType === 'client') {
        if (!clientId) { alert('Select a client'); setLoading(false); return; }
        const summary = await reportsAPI.clientSummary({ client_id: clientId, start_date: startDate, end_date: endDate });
        rows = (summary.data.by_employee || []).map((e: any) => ({
          user_name: e.employee_name, department_name: e.department,
          task_title: `${e.tasks ?? 0} tasks`, log_date: `${e.first_log ?? ''} – ${e.last_log ?? ''}`,
          start_time: '', end_time: '',
          duration_minutes: null, hours_worked: e.total_hours, status: `${e.entries ?? 0} entries`,
        }));
      } else if (reportType === 'department') {
        const res = await reportsAPI.department({ department: department || undefined, start_date: startDate, end_date: endDate });
        rows = Array.isArray(res.data) ? res.data : [];
      } else if (reportType === 'employee') {
        if (!employeeId) { alert('Select an employee'); setLoading(false); return; }
        const res = await reportsAPI.employee({ employee_id: employeeId, start_date: startDate, end_date: endDate });
        rows = Array.isArray(res.data) ? res.data : [];
      } else {
        const res = await reportsAPI.full({ start_date: startDate, end_date: endDate });
        rows = Array.isArray(res.data) ? res.data : [];
      }
      if (rows.length === 0) {
        setError('No data found for the selected filters.');
      }
      setReportData(rows);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || e?.response?.data?.error || 'Failed to generate report. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const totalHours = reportData.reduce((s, r) => s + parseFloat(r.hours_worked || 0), 0);
  const cols = COL_MAPS[reportType] || COL_MAPS.full;

  const downloadPDF = async () => {
    if (!reportData.length) return;
    setPdfLoading(true);
    try {
      const totalsRow: Record<string, any> = {};
      cols.forEach(c => { totalsRow[c] = ''; });
      totalsRow[cols[0]] = 'TOTAL';
      totalsRow['hours_worked'] = totalHours.toFixed(2);

      const res = await reportsAPI.generatePDF({
        rows: reportData, columns: cols,
        report_type: REPORT_TYPES.find(r => r.value === reportType)?.label || reportType,
        start_date: startDate, end_date: endDate,
        totals: totalsRow,
      });

      const blob = new Blob([res.data as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_report_${startDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    finally { setPdfLoading(false); }
  };

  const handlePrint = () => {
    if (!reportData.length) return;
    const API = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const topSrc = `${API}/static/letterpadtop.png`;
    const botSrc = `${API}/static/letterpadbottom.png`;

    const colHeaders = cols.map(c => `<th style="padding:6px 8px;border:1px solid #ccc;background:#dbeafe;font-size:11px">${COL_LABELS[c] || c}</th>`).join('');
    const dataRows = reportData.map(r =>
      `<tr>${cols.map(c => `<td style="padding:5px 8px;border:1px solid #ccc;font-size:11px">${cellVal(c, r[c])}</td>`).join('')}</tr>`
    ).join('');
    const totalRow = `<tr style="font-weight:bold;background:#f0f0f0">${cols.map((c, i) =>
      `<td style="padding:5px 8px;border:1px solid #ccc;font-size:11px">${i === 0 ? 'TOTAL' : c === 'hours_worked' ? totalHours.toFixed(2) : ''}</td>`
    ).join('')}</tr>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;color:#333}
      .top-img,.bot-img{width:100%;display:block}
      .content{padding:14px 20px}
      h2{font-size:14px;color:#2563eb;margin-bottom:4px}
      p.sub{font-size:10px;color:#555;margin-bottom:10px}
      table{width:100%;border-collapse:collapse}
      .footer{margin-top:12px;font-size:9px;color:#888;display:flex;justify-content:space-between}
      @media print{@page{margin:0}}
    </style></head><body>
    <img class="top-img" src="/letterpadtop.png" />
    <div class="content">
      <h2>${REPORT_TYPES.find(r => r.value === reportType)?.label}</h2>
      <p class="sub">Date Range: ${startDate} to ${endDate}</p>
      <table><thead><tr>${colHeaders}</tr></thead><tbody>${dataRows}${totalRow}</tbody></table>
      <div class="footer">
        <span>Total Hours: ${totalHours.toFixed(2)}</span>
        <span>Generated on: ${new Date().toLocaleString()}</span>
      </div>
    </div>
    <img class="bot-img" src="/letterpadbottom.png" />
    <script>window.onload=()=>{window.print();}<\/script>
    </body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white mb-8 no-print">Reports</h1>

      {/* Filters */}
      <div className="card mb-6 no-print">
        <h2 className="text-lg font-semibold mb-4">Generate Report</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Report Type</label>
            <select value={reportType} onChange={e => { setReportType(e.target.value); setReportData([]); }} className="input">
              {REPORT_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" />
          </div>
          <div className="flex items-end">
            <button onClick={generateReport} disabled={loading} className="btn-primary w-full">
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>

        {/* Conditional filters */}
        <div className="grid grid-cols-3 gap-4">
          {reportType === 'client' && (
            <div>
              <label className="block text-sm font-medium mb-1">Client</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)} className="input">
                <option value="">Select Client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
          )}
          {reportType === 'department' && (
            <div>
              <label className="block text-sm font-medium mb-1">Department (optional)</label>
              <select value={department} onChange={e => setDepartment(e.target.value)} className="input">
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
          {reportType === 'employee' && (
            <div>
              <label className="block text-sm font-medium mb-1">Employee</label>
              <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="input">
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {reportData.length > 0 && (
        <div className="card print-area">
          <div className="flex justify-between items-center mb-4 no-print">
            <div>
              <h2 className="text-xl font-semibold">{REPORT_TYPES.find(r => r.value === reportType)?.label}</h2>
              <p className="text-sm text-gray-500">{startDate} to {endDate} · {reportData.length} records</p>
            </div>
            <div className="flex gap-2">
              <button onClick={downloadPDF} disabled={pdfLoading} className="btn-secondary flex items-center gap-2 text-sm">
                <FiFileText size={14} /> {pdfLoading ? '...' : 'PDF'}
              </button>
              <button onClick={handlePrint} className="btn-secondary flex items-center gap-2 text-sm">
                <FiPrinter size={14} /> Print
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  {cols.map(c => (
                    <th key={c} className="px-3 py-3 text-left whitespace-nowrap">{COL_LABELS[c] || c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, idx) => (
                  <tr key={idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                    {cols.map(c => (
                      <td key={c} className="px-3 py-2 whitespace-nowrap">{cellVal(c, row[c])}</td>
                    ))}
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                  {cols.map((c, i) => (
                    <td key={c} className="px-3 py-2">
                      {i === 0 ? 'TOTAL' : c === 'hours_worked' ? totalHours.toFixed(2) : ''}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-gray-500 no-print">
            Grand Total: <span className="font-bold text-gray-800 dark:text-white">{totalHours.toFixed(2)} hours</span>
          </div>
        </div>
      )}
    </div>
  );
}
