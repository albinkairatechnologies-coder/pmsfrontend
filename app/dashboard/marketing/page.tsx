"use client";

import React, { useEffect, useState } from 'react';
import { 
  FiDollarSign, FiTarget, FiUsers, FiTrendingUp, FiPieChart, 
  FiActivity, FiArrowUpRight, FiArrowDownRight, FiPlus, FiX 
} from 'react-icons/fi';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { analyticsAPI, campaignAPI, expenseAPI } from '../../utils/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const MarketingDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const [newCampaign, setNewCampaign] = useState({ name: '', platform: 'Facebook', budget: 0 });
  const [newExpense, setNewExpense] = useState({ title: '', category: 'Marketing', amount: 0, expense_date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, campaignRes, expenseRes] = await Promise.all([
        analyticsAPI.getMarketing(),
        campaignAPI.getAll(),
        expenseAPI.getAll()
      ]);
      setData(analyticsRes.data);
      setCampaigns(campaignRes.data);
      setExpenses(expenseRes.data);
    } catch (error) {
      console.error("Error fetching marketing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await campaignAPI.create(newCampaign);
      setShowCampaignModal(false);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || "Unknown error";
      alert("Failed to create campaign: " + msg);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await expenseAPI.create(newExpense);
      setShowExpenseModal(false);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || "Unknown error";
      alert("Failed to create expense: " + msg);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-darker">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { finance, leads, campaigns: campaignStats, employee_performance } = data || {};

  return (
    <div className="p-4 md:p-6 bg-slate-50 dark:bg-darker min-h-screen text-slate-900 dark:text-white font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Marketing Dashboard</h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">Campaign performance and financial analytics in ₹</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm"
          >
            <FiPlus /> Add Expense
          </button>
          <button 
            onClick={() => setShowCampaignModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-md"
          >
            <FiPlus /> New Campaign
          </button>
        </div>
      </div>

      {/* 1. Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {[
          { label: 'Total Revenue', value: finance?.total_revenue, icon: FiDollarSign, color: 'blue', trend: '+12%' },
          { label: 'Total Expenses', value: finance?.total_expenses, icon: FiTrendingUp, color: 'red', trend: '+5%' },
          { label: 'Net Profit', value: finance?.net_profit, icon: FiActivity, color: 'emerald', trend: '+18%' },
          { label: 'ROI Percentage', value: `${finance?.roi_percentage.toFixed(1)}%`, icon: FiPieChart, color: 'violet', trend: '+2%' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-white/5 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-white/10 hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-3">
              <div className={`p-2.5 rounded-xl bg-${stat.color}-50 dark:bg-${stat.color}-500/10 text-${stat.color}-600 dark:text-${stat.color}-400 group-hover:scale-110 transition-transform`}>
                <stat.icon size={20} />
              </div>
              <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.trend.startsWith('+') ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                {stat.trend.startsWith('+') ? <FiArrowUpRight /> : <FiArrowDownRight />}
                {stat.trend}
              </span>
            </div>
            <h3 className="text-slate-500 dark:text-gray-400 text-xs font-medium">{stat.label}</h3>
            <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">
              {typeof stat.value === 'number' ? formatCurrency(stat.value) : stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-8">
        {/* 2. Revenue vs Expenses Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-white/5 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Financial Performance Trend</h2>
            <div className="text-xs text-slate-500 font-medium">Last 6 Months</div>
          </div>
          <div className="h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={finance?.monthly_trend}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.2} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#fff'}}
                  formatter={(v: any) => formatCurrency(v)}
                />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                <Area type="monotone" dataKey="expense" name="Expenses" stroke="#ef4444" fill="transparent" strokeWidth={3} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Lead Conversion Funnel */}
        <div className="bg-white dark:bg-white/5 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Lead Funnel</h2>
          <div className="space-y-5">
            {leads?.map((lead: any, idx: number) => {
              const total = leads.reduce((acc: number, curr: any) => acc + curr.count, 0);
              const percentage = ((lead.count / total) * 100).toFixed(0);
              return (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="capitalize font-medium text-slate-600 dark:text-gray-400">{lead.status}</span>
                    <span className="font-bold text-slate-800 dark:text-white">{lead.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-1.5">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-1000" 
                      style={{ width: `${percentage}%`, opacity: 1 - (idx * 0.12) }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-100 dark:border-blue-500/20">
            <h4 className="text-blue-800 dark:text-blue-400 text-sm font-bold flex items-center gap-2">
              <FiTrendingUp /> Insight
            </h4>
            <p className="text-blue-600 dark:text-blue-300 text-[11px] mt-1 leading-relaxed">
              Based on current data, your top lead source is Social Media. Increasing budget there could improve ROI by 8%.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8">
        {/* 4. Campaign Performance */}
        <div className="bg-white dark:bg-white/5 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Campaign Performance (₹)</h2>
          <div className="h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.2} />
                <XAxis dataKey="platform" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip 
                   contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#fff'}}
                   formatter={(v: any) => formatCurrency(v)}
                />
                <Legend iconType="circle" />
                <Bar dataKey="spend" name="Ad Spend" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={25} />
                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Employee Performance */}
        <div className="bg-white dark:bg-white/5 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Employee Lead Stats</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-slate-100 dark:border-white/5">
                  <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                  <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Leads</th>
                  <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Conversions</th>
                  <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                {employee_performance?.map((emp: any, idx: number) => {
                  const efficiency = ((emp.conversions / emp.leads_count) * 100).toFixed(1);
                  return (
                    <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px]">
                            {emp.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-700 dark:text-gray-200 text-sm">{emp.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-center font-medium text-slate-600 dark:text-gray-400 text-sm">{emp.leads_count}</td>
                      <td className="py-3.5 text-center font-medium text-slate-600 dark:text-gray-400 text-sm">{emp.conversions}</td>
                      <td className="py-3.5 text-right">
                        <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px]">
                          {efficiency}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 6. Active Campaigns Table */}
      <div className="bg-white dark:bg-white/5 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/10 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Recent Marketing Campaigns</h2>
          <button className="text-blue-600 dark:text-blue-400 text-xs font-bold hover:underline">Full View</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-100 dark:border-white/5">
                <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campaign</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Platform</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Budget</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spend</th>
                <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {campaigns.map((camp: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="py-4 font-bold text-slate-800 dark:text-white text-sm">{camp.name}</td>
                  <td className="py-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-gray-300 text-[10px] font-bold uppercase tracking-wide">
                      {camp.platform}
                    </span>
                  </td>
                  <td className="py-4 font-medium text-slate-700 dark:text-gray-300 text-sm">{formatCurrency(camp.budget)}</td>
                  <td className="py-4 font-medium text-slate-700 dark:text-gray-300 text-sm">{formatCurrency(camp.spend)}</td>
                  <td className="py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      camp.status === 'Running' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 
                      camp.status === 'Paused' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-gray-400'
                    }`}>
                      {camp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-darker w-full max-w-md p-6 rounded-2xl shadow-2xl border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Launch New Campaign</h3>
              <button onClick={() => setShowCampaignModal(false)} className="text-gray-400 hover:text-white"><FiX size={24} /></button>
            </div>
            <form onSubmit={handleAddCampaign} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Campaign Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-600 transition-all"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                  placeholder="e.g. Summer Mega Sale"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Platform</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-600 transition-all"
                    value={newCampaign.platform}
                    onChange={(e) => setNewCampaign({...newCampaign, platform: e.target.value})}
                  >
                    <option value="Facebook">Facebook</option>
                    <option value="Google">Google</option>
                    <option value="Instagram">Instagram</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Budget (₹)</label>
                  <input 
                    type="number" 
                    required
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-600 transition-all"
                    value={newCampaign.budget}
                    onChange={(e) => setNewCampaign({...newCampaign, budget: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-all mt-4">
                Launch Campaign
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-darker w-full max-w-md p-6 rounded-2xl shadow-2xl border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Add Business Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-gray-400 hover:text-white"><FiX size={24} /></button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Expense Title</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-600 transition-all"
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({...newExpense, title: e.target.value})}
                  placeholder="e.g. Meta Ads Recharge"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Category</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-600 transition-all"
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                  >
                    <option value="Marketing">Marketing</option>
                    <option value="Employee">Employee</option>
                    <option value="Software">Software</option>
                    <option value="Operational">Operational</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Amount (₹)</label>
                  <input 
                    type="number" 
                    required
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-600 transition-all"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-emerald-700 transition-all mt-4">
                Record Expense
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingDashboard;
