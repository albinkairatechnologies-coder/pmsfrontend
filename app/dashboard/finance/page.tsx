'use client';

import { useEffect, useState } from 'react';
import { financeAPI, reportsAPI } from '../../utils/api';
import { useAuth } from '../../utils/AuthContext';
import { FiDollarSign, FiAlertCircle, FiCheckCircle, FiClock, FiPlus, FiChevronDown, FiChevronUp, FiTrash2, FiDownload, FiFilter, FiX } from 'react-icons/fi';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', bank_transfer: 'Bank Transfer', cheque: 'Cheque',
  upi: 'UPI', card: 'Card', other: 'Other',
};

const fmt = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const paymentStatusBadge = (row: any) => {
  const total   = Number(row.total_amount || 0);
  const paid    = Number(row.paid_amount  || 0);
  const pending = total - paid;
  const overdue = row.deadline && new Date(row.deadline) < new Date() && pending > 0;
  if (total === 0)      return { label: 'No Amount Set', cls: 'bg-gray-100 dark:bg-gray-700 text-gray-500' };
  if (pending <= 0)     return { label: 'Fully Paid',    cls: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' };
  if (overdue)          return { label: 'Overdue',       cls: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' };
  if (paid > 0)         return { label: 'Partial',       cls: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' };
  return                       { label: 'Unpaid',        cls: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400' };
};

export default function FinancePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'marketing_head';

  const [clients, setClients]       = useState<any[]>([]);
  const [stats, setStats]           = useState<any>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [payments, setPayments]     = useState<Record<number, any[]>>({});
  const [showModal, setShowModal]   = useState(false);
  const [modalClient, setModalClient] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Filters & Export
  const [filterClient, setFilterClient] = useState('');
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');
  const [exporting, setExporting]       = useState<'csv' | 'pdf' | null>(null);

  const [form, setForm] = useState({
    amount: '', payment_date: '', payment_method: 'bank_transfer', reference: '', notes: '',
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [s, c] = await Promise.all([financeAPI.getStats(), financeAPI.getSummary()]);
      setStats(s.data);
      setClients(c.data);
    } catch { /* ignore */ }
  };

  const toggleExpand = async (clientId: number) => {
    if (expandedId === clientId) { setExpandedId(null); return; }
    setExpandedId(clientId);
    if (!payments[clientId]) {
      try {
        const res = await financeAPI.getClientFinance(clientId);
        setPayments(prev => ({ ...prev, [clientId]: res.data.payments }));
      } catch { /* ignore */ }
    }
  };

  const openAddPayment = (client: any) => {
    if (Number(client.total_amount || 0) === 0) {
      alert('Contract amount is not set for this client. Please edit the client first to set the total contract amount.');
      return;
    }
    setModalClient(client);
    setShowModal(true);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalClient) return;
    setLoading(true);
    try {
      await financeAPI.addPayment(modalClient.id, { ...form, amount: parseFloat(form.amount) });
      setShowModal(false);
      setForm({ amount: '', payment_date: '', payment_method: 'bank_transfer', reference: '', notes: '' });
      // refresh payments + client list (so paid_amount updates)
      const [res, summary] = await Promise.all([
        financeAPI.getClientFinance(modalClient.id),
        financeAPI.getSummary(),
      ]);
      setPayments(prev => ({ ...prev, [modalClient.id]: res.data.payments }));
      setClients(summary.data);
      load();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleDeletePayment = async (paymentId: number, clientId: number) => {
    if (!confirm('Delete this payment?')) return;
    try {
      await financeAPI.deletePayment(paymentId);
      const res = await financeAPI.getClientFinance(clientId);
      setPayments(prev => ({ ...prev, [clientId]: res.data.payments }));
      load();
    } catch { /* ignore */ }
  };

  const downloadReport = async (format: 'csv' | 'pdf') => {
    setExporting(format);
    try {
      const res = await financeAPI.getAllPayments({
        client_id: filterClient,
        start_date: startDate,
        end_date: endDate
      });
      const rows = res.data;
      if (rows.length === 0) {
        alert('No payments found for the selected filters.');
        return;
      }

      const report_type = 'Finance_Report';
      
      if (format === 'csv') {
        const csvRes = await reportsAPI.exportCSV({ rows, report_type });
        const url = window.URL.createObjectURL(new Blob([csvRes.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${report_type}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
      } else {
        const pdfRes = await reportsAPI.generatePDF({
          rows,
          report_type: 'Finance Payments Report',
          start_date: startDate || 'All Time',
          end_date: endDate || 'All Time',
          columns: ['company_name', 'payment_date', 'amount', 'payment_method', 'reference', 'added_by_name']
        });
        const url = window.URL.createObjectURL(new Blob([pdfRes.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${report_type}_${new Date().toISOString().split('T')[0]}.pdf`);
        document.body.appendChild(link);
        link.click();
      }
    } catch (err) {
      console.error('Export failed', err);
      alert('Failed to generate report');
    } finally {
      setExporting(null);
    }
  };


  const STAT_CARDS = [
    { label: 'Total Contract Value', value: fmt(stats.total_contract),   icon: FiDollarSign,   cls: 'text-blue-500' },
    { label: 'Total Collected',      value: fmt(stats.total_collected),  icon: FiCheckCircle,  cls: 'text-emerald-500' },
    { label: 'Total Pending',        value: fmt(stats.total_pending),    icon: FiClock,        cls: 'text-yellow-500' },
    { label: 'Overdue Clients',      value: stats.overdue_count ?? 0,    icon: FiAlertCircle,  cls: 'text-red-500' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finance</h1>
          <p className="text-gray-500 text-sm mt-0.5">Client payment tracking & revenue overview</p>
        </div>
        <div className="flex gap-2">
          <button 
            disabled={!!exporting}
            onClick={() => downloadReport('pdf')}
            className="btn-secondary gap-2 text-xs py-2">
            <FiDownload size={14} /> {exporting === 'pdf' ? 'Generating...' : 'Download PDF'}
          </button>
          <button 
            disabled={!!exporting}
            onClick={() => downloadReport('csv')}
            className="btn-secondary gap-2 text-xs py-2">
            <FiDownload size={14} /> {exporting === 'csv' ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex gap-4 flex-wrap items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5 ml-1">Filter by Client</label>
          <select className="input text-sm" value={filterClient} onChange={e => setFilterClient(e.target.value)}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>
        <div className="w-44">
          <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5 ml-1">Start Date</label>
          <input type="date" className="input text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="w-44">
          <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5 ml-1">End Date</label>
          <input type="date" className="input text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className="flex gap-2 h-10 items-center">
          {(filterClient || startDate || endDate) && (
            <button onClick={() => { setFilterClient(''); setStartDate(''); setEndDate(''); }}
              className="p-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all" title="Clear Filters">
              <FiX size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center gap-3 mb-2">
              <Icon size={18} className={cls} />
              <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Client Payment List */}
      <div className="space-y-3">
        {clients.map(client => {
          const badge   = paymentStatusBadge(client);
          const pending = Number(client.pending_amount || 0);
          const total   = Number(client.total_amount   || 0);
          const paid    = Number(client.paid_amount    || 0);
          const pct     = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
          const isOverdue = client.deadline && new Date(client.deadline) < new Date() && pending > 0;

          return (
            <div key={client.id} className="card p-0 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{client.company_name}</h3>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                      {isOverdue && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium flex items-center gap-1">
                          <FiAlertCircle size={11} /> Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{client.contact_person} · {client.email}</p>
                    {client.deadline && (
                      <p className="text-xs text-gray-400 mt-0.5">Deadline: {new Date(client.deadline).toLocaleDateString('en-IN')}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(isAdmin || user?.role === 'crm' || user?.role === 'crm_head') && (
                      <button onClick={() => openAddPayment(client)}
                        className="btn-primary gap-1.5 text-xs py-2 px-3">
                        <FiPlus size={13} /> Add Payment
                      </button>
                    )}
                    <button onClick={() => toggleExpand(client.id)}
                      className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all">
                      {expandedId === client.id ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Amount summary */}
                {total === 0 ? (
                  <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800">
                    <p className="text-xs text-orange-500 flex items-center gap-1.5">
                      <FiAlertCircle size={13} /> Contract amount not set — edit client to set total amount
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-50 dark:border-gray-800">
                    {[
                      { label: 'Contract Total', val: fmt(total),   cls: 'text-gray-700 dark:text-gray-300' },
                      { label: 'Paid',           val: fmt(paid),    cls: 'text-emerald-600 dark:text-emerald-400' },
                      { label: 'Pending',        val: fmt(pending), cls: pending > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400' },
                    ].map(({ label, val, cls }) => (
                      <div key={label}>
                        <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
                        <p className={`text-sm font-semibold mt-0.5 ${cls}`}>{val}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Progress bar */}
                {total > 0 && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{pct.toFixed(0)}% collected</p>
                  </div>
                )}
              </div>

              {/* Expanded: Payment History */}
              {expandedId === client.id && (
                <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/2 px-5 py-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Payment History</h4>
                  {!payments[client.id] ? (
                    <p className="text-sm text-gray-400">Loading...</p>
                  ) : payments[client.id].length === 0 ? (
                    <p className="text-sm text-gray-400">No payments recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {payments[client.id].map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                              <FiCheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{fmt(p.amount)}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(p.payment_date).toLocaleDateString('en-IN')} · {METHOD_LABELS[p.payment_method] || p.payment_method}
                                {p.reference ? ` · Ref: ${p.reference}` : ''}
                              </p>
                              {p.notes && <p className="text-xs text-gray-400 mt-0.5">📝 {p.notes}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-400">by {p.added_by_name || '—'}</p>
                            {user?.role === 'admin' && (
                              <button onClick={() => handleDeletePayment(p.id, client.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                                <FiTrash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Payment Modal */}
      {showModal && modalClient && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box w-full max-w-md mx-4 p-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Add Payment</h2>
            <p className="text-sm text-gray-500">{modalClient.company_name}</p>
            <div className="flex gap-4 mt-3 mb-6 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
              <div>
                <p className="text-xs text-gray-400">Contract Total</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{fmt(modalClient.total_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Already Paid</p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{fmt(modalClient.paid_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Remaining</p>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">{fmt(Number(modalClient.total_amount || 0) - Number(modalClient.paid_amount || 0))}</p>
              </div>
            </div>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount (₹) *</label>
                  <input type="number" required min="1" step="0.01" className="input"
                    value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Payment Date *</label>
                  <input type="date" required className="input"
                    value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Payment Method</label>
                <select className="input" value={form.payment_method}
                  onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                  {Object.entries(METHOD_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Reference / Transaction ID</label>
                <input type="text" className="input" placeholder="Optional"
                  value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
                <textarea className="input h-16 resize-none" placeholder="Optional"
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Saving...' : 'Add Payment'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
