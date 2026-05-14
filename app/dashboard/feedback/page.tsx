'use client';

import { useState, useEffect, useCallback } from 'react';
import { feedbackAPI, reviewAPI, authAPI } from '../../utils/api';
import { useAuth } from '../../utils/AuthContext';
import { FiMessageSquare, FiStar, FiCalendar, FiUsers, FiTrendingUp, FiEye, FiEyeOff } from 'react-icons/fi';

const LEAD_ROLES = ['admin', 'team_lead', 'marketing_head', 'crm_head'];

const CATEGORIES = [
  { value: 'work_environment', label: 'Work Environment' },
  { value: 'team_issue', label: 'Team Issue' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'general', label: 'General' },
];

const MEETING_TYPES = ['monthly', 'quarterly', 'annual', 'probation'];

const RATING_COLORS = ['', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-blue-400', 'text-emerald-400'];

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button" onClick={() => onChange?.(s)}
          className={`text-xl transition-colors ${s <= value ? 'text-yellow-400' : 'text-gray-600'} ${onChange ? 'hover:text-yellow-300 cursor-pointer' : 'cursor-default'}`}>
          ★
        </button>
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const { user } = useAuth();
  const isLead = LEAD_ROLES.includes(user?.role || '');
  const [tab, setTab] = useState<'submit' | 'my' | 'admin' | 'reviews'>('submit');

  // Submit form
  const [form, setForm] = useState({ category: 'general', message: '', rating: 3, visibility: 'named' });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  // Data
  const [myFeedback, setMyFeedback] = useState<any[]>([]);
  const [allFeedback, setAllFeedback] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Review schedule form
  const [reviewForm, setReviewForm] = useState({ employee_id: '', meeting_date: '', meeting_type: 'monthly', notes: '' });
  const [scheduling, setScheduling] = useState(false);

  // Complete review modal
  const [completing, setCompleting] = useState<any>(null);
  const [completeForm, setCompleteForm] = useState({ rating: 3, notes: '', improvement_points: '', goals_set: '' });

  const loadMyFeedback = useCallback(async () => {
    const res = await feedbackAPI.getMy();
    setMyFeedback(res.data);
  }, []);

  const loadAdmin = useCallback(async () => {
    const [fb, st] = await Promise.all([feedbackAPI.getAll(), feedbackAPI.getStats()]);
    setAllFeedback(fb.data);
    setStats(st.data);
  }, []);

  const loadReviews = useCallback(async () => {
    const myRes = await reviewAPI.getMy();
    setMyReviews(myRes.data);
    if (isLead) {
      const [allRes, empRes] = await Promise.all([reviewAPI.getAll(), authAPI.getUsers()]);
      setAllReviews(allRes.data);
      setEmployees(empRes.data.filter((u: any) => !LEAD_ROLES.includes(u.role)));
    }
  }, [isLead]);

  useEffect(() => {
    if (tab === 'my') loadMyFeedback();
    if (tab === 'admin' && isLead) loadAdmin();
    if (tab === 'reviews') loadReviews();
  }, [tab, isLead, loadMyFeedback, loadAdmin, loadReviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.message.trim()) return;
    setSubmitting(true);
    try {
      await feedbackAPI.submit(form);
      setSubmitMsg('Feedback submitted successfully!');
      setForm({ category: 'general', message: '', rating: 3, visibility: 'named' });
    } catch {
      setSubmitMsg('Failed to submit feedback.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setSubmitMsg(''), 3000);
    }
  };

  const handleScheduleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduling(true);
    try {
      await reviewAPI.schedule(reviewForm);
      setReviewForm({ employee_id: '', meeting_date: '', meeting_type: 'monthly', notes: '' });
      loadReviews();
    } catch { /* ignore */ }
    setScheduling(false);
  };

  const handleCompleteReview = async () => {
    if (!completing) return;
    await reviewAPI.complete(completing.id, completeForm);
    setCompleting(null);
    loadReviews();
  };

  const tabs = [
    { key: 'submit', label: 'Submit Feedback', icon: FiMessageSquare },
    { key: 'my', label: 'My Feedback', icon: FiStar },
    { key: 'reviews', label: 'Reviews', icon: FiCalendar },
    ...(isLead ? [{ key: 'admin', label: 'Admin View', icon: FiTrendingUp }] : []),
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Feedback & Reviews</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Share feedback and track performance reviews</p>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={tab === key ? 'tab-item-active flex items-center gap-2' : 'tab-item-inactive flex items-center gap-2'}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Submit Feedback ── */}
      {tab === 'submit' && (
        <div className="card max-w-xl">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Submit Feedback</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Category</label>
              <select className="input w-full" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Rating</label>
              <StarRating value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} />
            </div>

            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Message</label>
              <textarea className="input w-full h-28 resize-none" placeholder="Share your thoughts..."
                value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
            </div>

            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Visibility</label>
              <div className="flex gap-3">
                {['named', 'anonymous'].map(v => (
                  <button key={v} type="button"
                    onClick={() => setForm(f => ({ ...f, visibility: v }))}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all ${
                      form.visibility === v
                        ? 'bg-primary-500/20 border-primary-500/50 text-primary-600 dark:text-primary-400'
                        : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20'
                    }`}>
                    {v === 'named' ? <FiEye size={14} /> : <FiEyeOff size={14} />}
                    {v === 'named' ? 'Named' : 'Anonymous'}
                  </button>
                ))}
              </div>
            </div>

            {submitMsg && (
              <p className={`text-sm ${submitMsg.includes('success') ? 'text-emerald-400' : 'text-red-400'}`}>
                {submitMsg}
              </p>
            )}

            <button type="submit" disabled={submitting || !form.message.trim()} className="btn-primary w-full">
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>
      )}

      {/* ── My Feedback ── */}
      {tab === 'my' && (
        <div className="space-y-3">
          {myFeedback.length === 0 ? (
            <div className="card text-center text-gray-400 py-12">No feedback submitted yet.</div>
          ) : myFeedback.map(fb => (
            <div key={fb.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 border border-primary-500/30">
                    {CATEGORIES.find(c => c.value === fb.category)?.label || fb.category}
                  </span>
                  <p className="text-white mt-2">{fb.message}</p>                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <StarRating value={fb.rating} />
                  <p className="text-xs text-gray-500 mt-1">{new Date(fb.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Reviews Tab ── */}
      {tab === 'reviews' && (
        <div className="space-y-6">
          {/* Schedule form for leads */}
          {isLead && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <FiCalendar size={18} /> Schedule Review Meeting
              </h2>
              <form onSubmit={handleScheduleReview} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Employee</label>
                  <select className="input w-full" value={reviewForm.employee_id}
                    onChange={e => setReviewForm(f => ({ ...f, employee_id: e.target.value }))}>
                    <option value="">Select employee</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Meeting Date</label>
                  <input type="date" className="input w-full" value={reviewForm.meeting_date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setReviewForm(f => ({ ...f, meeting_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Type</label>
                  <select className="input w-full" value={reviewForm.meeting_type}
                    onChange={e => setReviewForm(f => ({ ...f, meeting_type: e.target.value }))}>
                    {MEETING_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Notes (optional)</label>
                  <input type="text" className="input w-full" placeholder="Pre-meeting notes"
                    value={reviewForm.notes}
                    onChange={e => setReviewForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <button type="submit" disabled={scheduling || !reviewForm.employee_id || !reviewForm.meeting_date}
                    className="btn-primary">
                    {scheduling ? 'Scheduling...' : 'Schedule Review'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* My reviews */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">My Reviews</h3>
            {myReviews.length === 0 ? (
              <div className="card text-center text-gray-400 py-8">No reviews yet.</div>
            ) : (
              <div className="space-y-3">
                {myReviews.map(r => (
                  <div key={r.id} className="card flex items-center justify-between">
                    <div>
                      <p className="text-gray-800 dark:text-white font-medium capitalize">{r.meeting_type} Review</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Reviewer: {r.reviewer_name} · {new Date(r.meeting_date).toLocaleDateString()}</p>
                      {r.notes && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{r.notes}</p>}
                    </div>
                    <div className="text-right">
                      {r.rating ? <StarRating value={r.rating} /> : null}
                      <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                        r.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        r.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>{r.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All reviews for leads */}
          {isLead && allReviews.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">All Reviews</h3>
              <div className="space-y-3">
                {allReviews.map(r => (
                  <div key={r.id} className="card flex items-center justify-between">
                    <div>
                      <p className="text-gray-800 dark:text-white font-medium">{r.employee_name}
                        <span className="text-gray-500 dark:text-gray-400 font-normal"> · {r.meeting_type} review</span>
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(r.meeting_date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.rating && <StarRating value={r.rating} />}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        r.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>{r.status}</span>
                      {r.status === 'scheduled' && (
                        <button onClick={() => { setCompleting(r); setCompleteForm({ rating: 3, notes: r.notes || '', improvement_points: '', goals_set: '' }); }}
                          className="btn-primary text-xs py-1 px-3">Complete</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Admin View ── */}
      {tab === 'admin' && isLead && (
        <div className="space-y-6">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total This Month', value: stats.total || 0, color: 'text-gray-800 dark:text-white' },
                { label: 'Avg Rating', value: `${stats.avg_rating || 0}/5`, color: 'text-yellow-500 dark:text-yellow-400' },
                { label: 'Suggestions', value: stats.suggestion || 0, color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Team Issues', value: stats.team_issue || 0, color: 'text-red-600 dark:text-red-400' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <p className="text-gray-400 text-xs">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Feedback list */}
          <div className="space-y-3">
            {allFeedback.map(fb => (
              <div key={fb.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-800 dark:text-white">{fb.employee_name}</span>
                      {fb.employee_role && (
                        <span className="text-xs text-gray-500">({fb.employee_role})</span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 border border-primary-500/30">
                        {CATEGORIES.find(c => c.value === fb.category)?.label || fb.category}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">{fb.message}</p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <StarRating value={fb.rating} />
                    <p className="text-xs text-gray-500 mt-1">{new Date(fb.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
            {allFeedback.length === 0 && (
              <div className="card text-center text-gray-400 py-12">No feedback this month.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Complete Review Modal ── */}
      {completing && (
        <div className="modal-overlay" onClick={() => setCompleting(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Complete Review — {completing.employee_name}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Rating</label>                <StarRating value={completeForm.rating} onChange={v => setCompleteForm(f => ({ ...f, rating: v }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Notes</label>
                <textarea className="input w-full h-20 resize-none" value={completeForm.notes}
                  onChange={e => setCompleteForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Improvement Points</label>
                <textarea className="input w-full h-20 resize-none" placeholder="Areas to improve..."
                  value={completeForm.improvement_points}
                  onChange={e => setCompleteForm(f => ({ ...f, improvement_points: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Goals Set</label>
                <textarea className="input w-full h-20 resize-none" placeholder="Goals for next period..."
                  value={completeForm.goals_set}
                  onChange={e => setCompleteForm(f => ({ ...f, goals_set: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleCompleteReview} className="btn-primary flex-1">Save Review</button>
                <button onClick={() => setCompleting(null)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
