'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { authAPI, rewardsAPI } from '../../utils/api';
import {
  FiUser, FiMail, FiPhone, FiLock, FiSave, FiBriefcase, FiAward,
  FiActivity, FiCamera, FiMapPin, FiCalendar, FiAlertCircle, FiEdit2
} from 'react-icons/fi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading]     = useState(false);
  const [saved, setSaved]         = useState('');
  const [error, setError]         = useState('');
  const [rewards, setRewards]     = useState<any>({ total_coins: 0, history: [] });
  const [imgPreview, setImgPreview] = useState<string>('');
  const [uploadingImg, setUploadingImg] = useState(false);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileForm, setProfileForm] = useState({
    name: '', phone: '', bio: '', dob: '', address: '',
    emergency_contact_name: '', emergency_contact_phone: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '', new_password: '', confirm_password: '',
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        name:                    user.name || '',
        phone:                   user.phone || '',
        bio:                     user.bio || '',
        dob:                     user.dob ? user.dob.split('T')[0] : '',
        address:                 user.address || '',
        emergency_contact_name:  user.emergency_contact_name || '',
        emergency_contact_phone: user.emergency_contact_phone || '',
      });
      if (user.profile_image) {
        setImgPreview(`${API_URL}/auth/profile/image/${user.profile_image}${user.profile_image.includes('?') ? '' : `?v=${Date.now()}`}`);
        setImgError(false);
      }
      rewardsAPI.getStats().then(r => setRewards(r.data)).catch(() => {});
    }
  }, [user]);

  const showSaved = (msg: string) => {
    setSaved(msg); setTimeout(() => setSaved(''), 3000);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgPreview(URL.createObjectURL(file));
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await authAPI.uploadProfileImage(fd);
      if (res.data.profile_image) {
        setImgPreview(`${API_URL}/auth/profile/image/${res.data.profile_image}`);
        setImgError(false);
      }
      await refreshUser();
      showSaved(res.data.message || 'Profile photo updated!');
    } catch (err: any) {
      console.error('Upload error:', err);
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Failed to upload image';
      setError(msg);
    } finally {
      setUploadingImg(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await authAPI.updateProfile(profileForm);
      await refreshUser();
      showSaved('Profile updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('New passwords do not match'); return;
    }
    setLoading(true); setError('');
    try {
      await authAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password:     passwordForm.new_password,
      });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      showSaved('Password changed successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in p-4">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-3xl font-black text-shimmer uppercase tracking-tighter">My Profile</h1>
          <p className="text-gray-500 text-sm">Manage your personal information and security settings.</p>
        </div>
        {saved && (
          <div className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-xs font-bold border border-emerald-500/20">
            ✓ {saved}
          </div>
        )}
        {error && (
          <div className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold border border-red-500/20 flex items-center gap-2">
            <FiAlertCircle size={13} /> {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ── Left Column ── */}
        <div className="lg:col-span-1 space-y-5">

          {/* Profile Card */}
          <div className="bg-white dark:bg-dark-card rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-xl flex flex-col items-center text-center">

            {/* Avatar with upload */}
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                {imgPreview && !imgError ? (
                  <img 
                    src={imgPreview} 
                    alt="profile" 
                    className="w-full h-full object-cover" 
                    crossOrigin="anonymous" 
                    onLoad={() => console.log('Profile image loaded successfully:', imgPreview)}
                    onError={(e) => {
                      console.error('Profile image load failed:', imgPreview, e);
                      setImgError(true);
                    }}
                  />
                ) : (
                  <span className="text-white text-3xl font-bold">{initials}</span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImg}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center shadow-lg transition disabled:opacity-50"
                title="Change photo"
              >
                {uploadingImg
                  ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <FiCamera size={13} className="text-white" />
                }
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>

            <h2 className="text-lg font-bold dark:text-white capitalize">{user?.name}</h2>
            <p className="text-xs font-black uppercase text-indigo-500 tracking-widest mt-1">{user?.role?.replace(/_/g, ' ')}</p>

            <div className="w-full mt-5 py-4 px-4 bg-slate-50 dark:bg-white/5 rounded-2xl flex flex-col gap-3 text-left">
              <div className="flex items-center gap-3">
                <FiMail className="text-gray-400 flex-shrink-0" size={14} />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Email</p>
                  <p className="text-xs truncate dark:text-gray-300">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FiBriefcase className="text-gray-400 flex-shrink-0" size={14} />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Department</p>
                  <p className="text-xs truncate dark:text-gray-300">{user?.department_name || 'Unassigned'}</p>
                </div>
              </div>
              {user?.phone && (
                <div className="flex items-center gap-3">
                  <FiPhone className="text-gray-400 flex-shrink-0" size={14} />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Phone</p>
                    <p className="text-xs truncate dark:text-gray-300">{user.phone}</p>
                  </div>
                </div>
              )}
              {user?.address && (
                <div className="flex items-center gap-3">
                  <FiMapPin className="text-gray-400 flex-shrink-0" size={14} />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Address</p>
                    <p className="text-xs truncate dark:text-gray-300">{user.address}</p>
                  </div>
                </div>
              )}
            </div>

            {user?.bio && (
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 italic text-center leading-relaxed">
                "{user.bio}"
              </p>
            )}
          </div>

          {/* Coins Card */}
          <div className="bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-2xl shadow-orange-500/20 relative overflow-hidden border border-white/20">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <FiAward size={70} />
            </div>
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Achievement Points</span>
              <div className="flex items-end gap-2 mt-3">
                <h2 className="text-5xl font-black">{rewards.total_coins}</h2>
                <span className="text-xs font-bold pb-2 uppercase tracking-widest opacity-80">Coins</span>
              </div>
              <div className="mt-6 pt-4 border-t border-white/20">
                <div className="flex items-center gap-2 px-3 py-2 bg-black/10 rounded-xl text-[9px] font-black uppercase tracking-widest">
                  <FiActivity size={12} /> {rewards.history?.length || 0} Recent Achievements
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="lg:col-span-3 space-y-6">

          {/* Edit Profile Form */}
          <div className="bg-white dark:bg-dark-card rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-xl">
            <h3 className="text-base font-bold mb-5 flex items-center gap-2 dark:text-white">
              <FiEdit2 className="text-indigo-500" /> Personal Information
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Full Name</label>
                  <input type="text" value={profileForm.name}
                    onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 outline-none transition dark:text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Phone Number</label>
                  <input type="text" value={profileForm.phone}
                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 outline-none transition dark:text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block flex items-center gap-1"><FiCalendar size={10} /> Date of Birth</label>
                  <input type="date" value={profileForm.dob}
                    onChange={e => setProfileForm({ ...profileForm, dob: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 outline-none transition dark:text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block flex items-center gap-1"><FiMapPin size={10} /> Address</label>
                  <input type="text" value={profileForm.address} placeholder="Your address"
                    onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 outline-none transition dark:text-white" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Bio / About Me</label>
                <textarea value={profileForm.bio} rows={3} placeholder="Write a short bio about yourself..."
                  onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 outline-none transition dark:text-white resize-none" />
              </div>

              {/* Emergency Contact */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1">
                  <FiAlertCircle size={10} /> Emergency Contact
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" value={profileForm.emergency_contact_name} placeholder="Contact name"
                    onChange={e => setProfileForm({ ...profileForm, emergency_contact_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 outline-none transition dark:text-white" />
                  <input type="text" value={profileForm.emergency_contact_phone} placeholder="Contact phone"
                    onChange={e => setProfileForm({ ...profileForm, emergency_contact_phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 outline-none transition dark:text-white" />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition active:scale-95 flex items-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50">
                <FiSave size={13} /> {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white dark:bg-dark-card rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-xl">
            <h3 className="text-base font-bold mb-5 flex items-center gap-2 dark:text-white">
              <FiLock className="text-indigo-500" /> Change Password
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Current Password</label>
                  <input type="password" value={passwordForm.current_password} placeholder="••••••••"
                    onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 outline-none transition dark:text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">New Password</label>
                  <input type="password" value={passwordForm.new_password} placeholder="••••••••"
                    onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 outline-none transition dark:text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Confirm Password</label>
                  <input type="password" value={passwordForm.confirm_password} placeholder="••••••••"
                    onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 outline-none transition dark:text-white" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition active:scale-95 flex items-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50">
                <FiLock size={13} /> {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Reward History */}
          <div className="bg-white dark:bg-dark-card rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-xl overflow-hidden">
            <h3 className="text-base font-bold mb-5 flex items-center gap-2 dark:text-white">
              <FiAward className="text-amber-500" /> Recent Appreciations
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/5 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                    <th className="pb-3">Reason</th>
                    <th className="pb-3 text-center">Reward</th>
                    <th className="pb-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {rewards.history.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                      <td className="py-3 text-sm font-bold text-gray-800 dark:text-gray-200">{row.reason}</td>
                      <td className="py-3 text-center">
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-[11px] font-black">+{row.amount}</span>
                      </td>
                      <td className="py-3 text-right text-[10px] font-black text-gray-400">
                        {new Date(row.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {rewards.history.length === 0 && (
                    <tr><td colSpan={3} className="py-8 text-center text-sm text-gray-400 italic">No achievement coins yet. Start completing tasks on time!</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

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
      `}</style>
    </div>
  );
}
