'use client';

import { useAuth } from '../utils/AuthContext';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import ActivityTracker from '../components/ActivityTracker';
import IdleWarningModal from '../components/IdleWarningModal';
import NotificationBell from '../components/NotificationBell';

import { useState } from 'react';
import { FiMenu } from 'react-icons/fi';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="flex bg-transparent min-h-screen">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <ActivityTracker />
      <IdleWarningModal />
      
      <main className="flex-1 lg:ml-64 min-h-screen bg-transparent dark:bg-transparent transition-all duration-300">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 bg-white/50 dark:bg-darker/50 backdrop-blur-md border-b border-gray-100 dark:border-white/5 sticky top-0 z-[100]">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">KairaFlow</h1>
           </div>
           <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all">
              <FiMenu size={24} />
           </button>
        </div>

        <div className="flex justify-end px-6 pt-4 no-print">
          <NotificationBell />
        </div>
        <div className="px-4 md:px-6 pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
