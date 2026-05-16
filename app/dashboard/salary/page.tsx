'use client';

import { useEffect, useState } from 'react';
import { salaryAPI } from '../../utils/api';
import { FiDollarSign, FiSettings, FiClock, FiPlus, FiCheck, FiAward, FiEdit2, FiX } from 'react-icons/fi';

export default function SalaryPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total_spent: 0, month_spent: 0 });
  const [tab, setTab] = useState<'config' | 'pay' | 'history' | 'coins'>('config');
  const [loading, setLoading] = useState(true);

  // Coin states
  const [coinSummary, setCoinSummary] = useState<any[]>([]);
  const [coinValue, setCoinValue] = useState(1.0);
  const [editCoinValue, setEditCoinValue] = useState(false);
  const [newCoinValue, setNewCoinValue] = useState('1');
  const [awardModal, setAwardModal] = useState<any>(null);
  const [awardAmount, setAwardAmount] = useState('');
  const [awardReason, setAwardReason] = useState('');
  const [coinHistoryUser, setCoinHistoryUser] = useState<any>(null);
  const [coinHistory, setCoinHistory] = useState<any[]>([]);
  const [coinRules, setCoinRules] = useState<any[]>([]);

  // Form states
  const [payForm, setPayForm] = useState({
    user_id: '',
    amount: '',
    allowance: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    leaves: 0,
    present_days: 0,
    total_working: 0
  });

  useEffect(() => {
    if (payForm.user_id && payForm.month && payForm.year) {
      autoCalculate();
    }
  }, [payForm.user_id, payForm.month, payForm.year]);

  const autoCalculate = async () => {
    try {
      const { data } = await salaryAPI.calculate({
        user_id: parseInt(payForm.user_id),
        month: payForm.month,
        year: payForm.year
      });
      setPayForm(prev => ({
        ...prev,
        amount: (data.expected_salary - data.allowance - (data.coin_bonus || 0)).toString(),
        allowance: data.allowance.toString(),
        leaves: data.leaves,
        present_days: data.present_days,
        total_working: data.total_working_days
      }));
    } catch (err) {
      console.error("Calculation failed", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, h, s] = await Promise.all([
        salaryAPI.getConfigs(),
        salaryAPI.getHistory(),
        salaryAPI.getStats()
      ]);
      setConfigs(c.data);
      setHistory(h.data);
      setStats(s.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCoinData = async () => {
    try {
      const [summary, rules] = await Promise.all([
        salaryAPI.getCoinsSummary(),
        salaryAPI.getCoinRules(),
      ]);
      setCoinSummary(summary.data.employees);
      setCoinValue(summary.data.coin_value_rupees);
      setNewCoinValue(String(summary.data.coin_value_rupees));
      setCoinRules(rules.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (tab === 'coins') loadCoinData(); }, [tab]);

  const handleUpdateCoinValue = async () => {
    try {
      await salaryAPI.updateCoinSettings({ coin_value_rupees: parseFloat(newCoinValue) });
      setEditCoinValue(false);
      loadCoinData();
    } catch (err: any) { alert(err?.response?.data?.error || 'Failed to update'); }
  };

  const handleAwardCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardModal || !awardAmount) return;
    try {
      await salaryAPI.awardCoins({ user_id: awardModal.user_id, amount: parseInt(awardAmount), reason: awardReason || 'Performance bonus' });
      setAwardModal(null); setAwardAmount(''); setAwardReason('');
      loadCoinData();
    } catch (err: any) { alert(err?.response?.data?.error || 'Failed to award'); }
  };

  const openCoinHistory = async (emp: any) => {
    setCoinHistoryUser(emp);
    const res = await salaryAPI.getCoinHistory(emp.user_id);
    setCoinHistory(res.data);
  };

  const handleUpdateConfig = async (userId: number, base: number, allowance: number) => {
    try {
      await salaryAPI.updateConfig({ user_id: userId, base_salary: base, allowance: allowance });
      loadData();
    } catch (err) {
      alert("Failed to update config");
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payForm.user_id || !payForm.amount) return;
    try {
      await salaryAPI.paySalary({
        user_id: parseInt(payForm.user_id),
        amount: parseFloat(payForm.amount),
        allowance: parseFloat(payForm.allowance || '0'),
        month: payForm.month,
        year: payForm.year
      });
      alert("Payment recorded successfully");
      loadData();
      setTab('history');
    } catch (err) {
      alert("Failed to record payment");
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white">Salary Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Track and manage employee compensations</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Total Spent</p>
            <p className="text-2xl font-black text-primary">₹{stats.total_spent.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">This Month</p>
            <p className="text-2xl font-black text-secondary-500">₹{stats.month_spent.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b dark:border-gray-700">
        <button onClick={() => setTab('config')} 
          className={`px-6 py-3 text-sm font-bold transition flex items-center gap-2 border-b-2 ${
            tab === 'config' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}>
          <FiSettings /> Configuration
        </button>
        <button onClick={() => setTab('pay')} 
          className={`px-6 py-3 text-sm font-bold transition flex items-center gap-2 border-b-2 ${
            tab === 'pay' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}>
          <FiDollarSign /> Pay Salary
        </button>
        <button onClick={() => setTab('history')} 
          className={`px-6 py-3 text-sm font-bold transition flex items-center gap-2 border-b-2 ${
            tab === 'history' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}>
          <FiClock /> Payment History
        </button>
        <button onClick={() => setTab('coins')}
          className={`px-6 py-3 text-sm font-bold transition flex items-center gap-2 border-b-2 ${
            tab === 'coins' ? 'border-yellow-500 text-yellow-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}>
          <FiAward /> Gold Coins
        </button>
      </div>

      {/* Global Actions */}
      <div className="flex justify-end gap-3">
        <button 
          onClick={async () => {
            try {
              const res = await (await import('../../utils/api')).reportsAPI.salaryReport(payForm.month, payForm.year);
              const blob = new Blob([res.data], { type: 'application/pdf' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Salary_Report_${payForm.month}_${payForm.year}.pdf`;
              a.click();
              window.URL.revokeObjectURL(url);
            } catch (err) {
              alert("Failed to download PDF report");
            }
          }}
          className="btn-secondary text-xs py-2 px-4 flex items-center gap-2 bg-red-50 text-red-600 border-red-100 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
        >
          Download PDF Report
        </button>
        <button 
          onClick={async () => {
            try {
              const res = await (await import('../../utils/api')).reportsAPI.salaryReportDocx(payForm.month, payForm.year);
              const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Salary_Report_${payForm.month}_${payForm.year}.docx`;
              a.click();
              window.URL.revokeObjectURL(url);
            } catch (err) {
              alert("Failed to download Word report");
            }
          }}
          className="btn-secondary text-xs py-2 px-4 flex items-center gap-2 bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30"
        >
          Download Word Report
        </button>
      </div>

      {/* Tab Content: Configuration */}
      {tab === 'config' && (
        <div className="grid grid-cols-1 gap-4">
          <div className="card overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Employee</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Role</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Base Salary (Manual)</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Allowance</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {configs.map(emp => (
                  <SalaryConfigRow 
                    key={emp.user_id} 
                    employee={emp} 
                    onSave={(base, allow) => handleUpdateConfig(emp.user_id, base, allow)} 
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Pay */}
      {tab === 'pay' && (
        <div className="max-w-2xl mx-auto">
          <div className="card p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <FiPlus className="text-primary" /> Record New Payment
            </h2>
            <form onSubmit={handlePay} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Select Employee</label>
                  <select 
                    className="input" 
                    value={payForm.user_id} 
                    onChange={e => {
                      const uid = e.target.value;
                      const emp = configs.find(c => c.user_id == uid);
                      setPayForm({ 
                        ...payForm, 
                        user_id: uid, 
                        amount: emp?.base_salary || '', 
                        allowance: emp?.allowance || '' 
                      });
                    }}
                    required
                  >
                    <option value="">-- Select --</option>
                    {configs.map(emp => (
                      <option key={emp.user_id} value={emp.user_id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>
                {payForm.user_id && (
                  <div className="col-span-2 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 flex justify-around text-center">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-blue-500">Working Days</p>
                      <p className="text-xl font-black text-blue-700 dark:text-blue-400">{payForm.total_working}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-green-500">Present</p>
                      <p className="text-xl font-black text-green-600 dark:text-green-400">{payForm.present_days}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-red-500">Leaves</p>
                      <p className="text-xl font-black text-red-600 dark:text-red-400">{payForm.leaves}</p>
                    </div>
                  </div>
                )}
                <div>
                  <label className="label">Base Amount (₹)</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={payForm.amount} 
                    onChange={e => setPayForm({ ...payForm, amount: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <label className="label">Allowance (₹)</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={payForm.allowance} 
                    onChange={e => setPayForm({ ...payForm, allowance: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="label">Month</label>
                  <select className="input" value={payForm.month} onChange={e => setPayForm({ ...payForm, month: parseInt(e.target.value) })}>
                    {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Year</label>
                  <input type="number" className="input" value={payForm.year} onChange={e => setPayForm({ ...payForm, year: parseInt(e.target.value) })} />
                </div>
              </div>
              <div className="pt-4">
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl mb-4 flex justify-between items-center">
                  <span className="text-sm font-bold">Total Payout:</span>
                  <span className="text-xl font-black text-primary">
                    ₹{(parseFloat(payForm.amount || '0') + parseFloat(payForm.allowance || '0')).toLocaleString()}
                  </span>
                </div>
                <button type="submit" className="btn-primary w-full py-4 shadow-lg shadow-primary/20">
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab Content: History */}
      {tab === 'history' && (
        <div className="card overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Employee</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Period</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Base</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Allowance</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Total Paid</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {history.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                  <td className="px-6 py-4">
                    <div className="font-bold">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    {months[item.month - 1]} {item.year}
                  </td>
                  <td className="px-6 py-4 text-sm">₹{parseFloat(item.amount).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-secondary-500">+₹{parseFloat(item.allowance).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full text-sm font-bold">
                      ₹{parseFloat(item.total).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(item.paid_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No payment records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* Tab Content: Gold Coins */}
      {tab === 'coins' && (
        <div className="space-y-6">

          {/* Coin Value Setting */}
          <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-6 text-white shadow-xl shadow-amber-400/20 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-widest opacity-80">1 Gold Coin =</p>
              {editCoinValue ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-black">₹</span>
                  <input autoFocus type="number" min="0.01" step="0.01" value={newCoinValue}
                    onChange={e => setNewCoinValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdateCoinValue(); if (e.key === 'Escape') setEditCoinValue(false); }}
                    className="w-32 text-2xl font-black bg-white/20 rounded-xl px-3 py-1 outline-none border-2 border-white/40 text-white placeholder-white/60" />
                  <button onClick={handleUpdateCoinValue} className="flex items-center gap-1 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition font-black text-sm"><FiCheck size={16}/> Save</button>
                  <button onClick={() => { setEditCoinValue(false); setNewCoinValue(String(coinValue)); }} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition"><FiX size={16}/></button>
                </div>
              ) : (
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-4xl font-black">₹{coinValue}</span>
                  <button onClick={() => { setEditCoinValue(true); setNewCoinValue(String(coinValue)); }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition font-black text-sm">
                    <FiEdit2 size={14}/> Edit Rate
                  </button>
                </div>
              )}
              <p className="text-xs mt-2 opacity-80">Coin bonuses are automatically added to salary calculations each month.</p>
            </div>
            <FiAward size={64} className="opacity-20" />
          </div>

          {/* Reward Rules */}
          <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5">
              <h3 className="font-black text-gray-800 dark:text-white text-sm uppercase tracking-widest">Reward Rules</h3>
              <p className="text-xs text-gray-400 mt-0.5">Define how many coins are awarded for each action. Changes apply to future rewards only.</p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {coinRules.map((rule: any) => (
                <CoinRuleRow key={rule.id} rule={rule} onSave={async (id, coins, is_active) => {
                  await salaryAPI.updateCoinRule(id, { coins, is_active });
                  loadCoinData();
                }} />
              ))}
            </div>
          </div>

          {/* Employee Coins Table */}
          <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <h3 className="font-black text-gray-800 dark:text-white text-sm uppercase tracking-widest">Employee Coin Balances</h3>
              <p className="text-xs text-gray-400">Click a row to view history · Click Award to give coins</p>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-white/2">
                <tr>
                  {['Employee', 'Role', 'Total Coins', 'Rupee Value', 'Awards Given', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {coinSummary.map(emp => (
                  <tr key={emp.user_id} className="hover:bg-gray-50 dark:hover:bg-white/2 transition cursor-pointer" onClick={() => openCoinHistory(emp)}>
                    <td className="px-6 py-4 font-bold text-sm text-gray-900 dark:text-white">{emp.name}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase px-2 py-1 bg-gray-100 dark:bg-white/10 text-gray-500 rounded-lg">{emp.role?.replace('_',' ')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🪙</span>
                        <span className="font-black text-amber-500 text-lg">{emp.total_coins}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">₹{emp.rupee_value.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{emp.award_count} times</td>
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setAwardModal(emp); setAwardAmount(''); setAwardReason(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition active:scale-95 shadow-md shadow-amber-400/20">
                        <FiAward size={12}/> Award
                      </button>
                    </td>
                  </tr>
                ))}
                {coinSummary.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">No employees found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Award Coins Modal */}
      {awardModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-gray-900 dark:text-white">Award Gold Coins</h3>
              <button onClick={() => setAwardModal(null)} className="p-1.5 text-gray-400 hover:text-red-500 transition"><FiX size={18}/></button>
            </div>
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl mb-5">
              <span className="text-2xl">🪙</span>
              <div>
                <p className="font-black text-sm text-gray-900 dark:text-white">{awardModal.name}</p>
                <p className="text-xs text-gray-500">{awardModal.total_coins} coins · ₹{awardModal.rupee_value} current value</p>
              </div>
            </div>
            <form onSubmit={handleAwardCoins} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Coins to Award</label>
                <input type="number" min="1" required value={awardAmount} onChange={e => setAwardAmount(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-amber-500/10 dark:text-white" />
                {awardAmount && <p className="text-xs text-amber-600 mt-1">= ₹{(parseInt(awardAmount||'0') * coinValue).toFixed(2)} added to salary</p>}
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Reason</label>
                <input type="text" value={awardReason} onChange={e => setAwardReason(e.target.value)}
                  placeholder="e.g. Excellent performance in Q1"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-4 focus:ring-amber-500/10 dark:text-white" />
              </div>
              <button type="submit" className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl shadow-lg shadow-amber-400/20 transition active:scale-95 flex items-center justify-center gap-2">
                <FiAward size={16}/> Award Coins
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Coin History Modal */}
      {coinHistoryUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-md shadow-2xl border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <h3 className="font-black text-gray-900 dark:text-white">{coinHistoryUser.name}'s Coin History</h3>
                <p className="text-xs text-gray-400 mt-0.5">Total: 🪙 {coinHistoryUser.total_coins} = ₹{coinHistoryUser.rupee_value}</p>
              </div>
              <button onClick={() => setCoinHistoryUser(null)} className="p-1.5 text-gray-400 hover:text-red-500 transition"><FiX size={18}/></button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
              {coinHistory.length === 0 && <p className="p-6 text-center text-gray-400 text-sm">No coins awarded yet.</p>}
              {coinHistory.map((h: any) => (
                <div key={h.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xl">🪙</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 dark:text-white">+{h.amount} coins</p>
                    <p className="text-xs text-gray-500 truncate">{h.reason}</p>
                    <p className="text-[10px] text-gray-400">by {h.awarded_by_name || 'System'} · {new Date(h.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-500">₹{(h.amount * coinValue).toFixed(2)}</span>
                </div>
              ))}
            </div>
            {/* Award more from history modal */}
            <div className="p-4 border-t border-gray-100 dark:border-white/5">
              <button onClick={() => { setCoinHistoryUser(null); setAwardModal(coinHistoryUser); setAwardAmount(''); setAwardReason(''); }}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs transition active:scale-95 flex items-center justify-center gap-2">
                <FiAward size={14}/> Award More Coins
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CoinRuleRow({ rule, onSave }: { rule: any, onSave: (id: number, coins: number, is_active: number) => void }) {
  const [coins, setCoins] = useState(rule.coins);
  const [active, setActive] = useState(rule.is_active === 1);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    setCoins(rule.coins);
    setActive(rule.is_active === 1);
    setChanged(false);
  }, [rule]);

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/2 transition">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-white">{rule.rule_label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{rule.description}</p>
      </div>
      <div className="flex items-center gap-3">
        {/* Toggle active */}
        <button onClick={() => { setActive(!active); setChanged(true); }}
          className={`relative w-10 h-5 rounded-full transition-colors ${ active ? 'bg-amber-500' : 'bg-gray-200 dark:bg-white/10'}`}>
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${ active ? 'translate-x-5' : 'translate-x-0.5'}`}/>
        </button>
        {/* Coins input */}
        <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-3 py-1.5">
          <span className="text-sm">🪙</span>
          <input type="number" min="0" value={coins}
            onChange={e => { setCoins(parseInt(e.target.value) || 0); setChanged(true); }}
            className="w-16 bg-transparent outline-none text-sm font-black text-amber-600 dark:text-amber-400 text-center" />
          <span className="text-xs text-amber-500 font-bold">coins</span>
        </div>
        {/* Save */}
        {changed && (
          <button onClick={() => { onSave(rule.id, coins, active ? 1 : 0); setChanged(false); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition active:scale-95">
            <FiCheck size={12}/> Save
          </button>
        )}
      </div>
    </div>
  );
}

function SalaryConfigRow({ employee, onSave }: { employee: any, onSave: (base: number, allow: number) => void }) {
  const [base, setBase] = useState(employee.base_salary || 0);
  const [allow, setAllow] = useState(employee.allowance || 0);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    setBase(employee.base_salary || 0);
    setAllow(employee.allowance || 0);
    setChanged(false);
  }, [employee]);

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
      <td className="px-6 py-4">
        <div className="font-bold">{employee.name}</div>
        <div className="text-xs text-gray-500">{employee.email}</div>
      </td>
      <td className="px-6 py-4">
        <span className="text-xs font-bold uppercase px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
          {employee.role?.replace('_', ' ')}
        </span>
      </td>
      <td className="px-6 py-4">
        <input 
          type="number" 
          className="input h-9 w-32" 
          value={base} 
          onChange={e => { setBase(e.target.value); setChanged(true); }} 
        />
      </td>
      <td className="px-6 py-4">
        <input 
          type="number" 
          className="input h-9 w-32" 
          value={allow} 
          onChange={e => { setAllow(e.target.value); setChanged(true); }} 
        />
      </td>
      <td className="px-6 py-4">
        {changed && (
          <button 
            onClick={() => { onSave(parseFloat(base), parseFloat(allow)); setChanged(false); }}
            className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-dark transition"
          >
            <FiCheck /> Save
          </button>
        )}
      </td>
    </tr>
  );
}
