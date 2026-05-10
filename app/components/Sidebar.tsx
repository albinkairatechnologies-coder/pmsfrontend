'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiHome, FiUsers, FiCheckSquare, FiClock, FiBarChart2, FiLogOut, FiMoon, FiSun, FiGrid, FiSettings, FiCalendar, FiActivity, FiUmbrella, FiShield, FiMessageSquare, FiPieChart, FiChevronDown, FiChevronRight, FiDollarSign, FiUser, FiGlobe, FiFolder, FiTrendingUp, FiHardDrive, FiX } from 'react-icons/fi';
import { useAuth } from '../utils/AuthContext';
import { useState, useEffect } from 'react';
import { domainAPI } from '../utils/api';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  marketing_head: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  team_lead: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  crm:          'bg-pink-500/20 text-pink-400 border-pink-500/30',
  crm_head:      'bg-rose-500/20 text-rose-400 border-rose-500/30',
  developer: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  smm: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  employee: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  client: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const AVATAR_COLORS = ['bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-emerald-500', 'bg-amber-500', 'bg-cyan-500'];

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (o: boolean) => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [domainAlertCount, setDomainAlertCount] = useState(0);

  useEffect(() => {
    if (user && ['admin', 'crm_head', 'marketing_head', 'team_lead'].includes(user.role)) {
      domainAPI.getAlerts().then(r => setDomainAlertCount(r.data.total_alerts)).catch(() => {});
      const t = setInterval(() => {
        domainAPI.getAlerts().then(r => setDomainAlertCount(r.data.total_alerts)).catch(() => {});
      }, 60000);
      return () => clearInterval(t);
    }
  }, [user]);

  const navItems = [
    { href: '/dashboard', icon: FiHome, label: 'Dashboard', roles: ['admin', 'marketing_head', 'developer', 'smm', 'crm_head', 'client', 'team_lead', 'employee'] },
    { href: '/dashboard/profile', icon: FiUser, label: 'My Profile', roles: ['admin', 'marketing_head', 'developer', 'smm', 'crm_head', 'client', 'team_lead', 'employee'] },
    { href: '/dashboard/announcements', icon: FiGlobe, label: 'Announcements', roles: ['admin', 'marketing_head', 'developer', 'smm', 'crm_head', 'client', 'team_lead', 'employee'] },
    { href: '/dashboard/org', icon: FiGrid, label: 'Organization', roles: ['admin'] },
    { href: '/dashboard/clients', icon: FiUsers, label: 'Clients', roles: ['admin', 'crm_head', 'marketing_head', 'team_lead'] },
    { href: '/dashboard/leads',   icon: FiTrendingUp, label: 'Leads', roles: ['admin', 'crm_head', 'marketing_head', 'smm'] },
    { href: '/dashboard/tasks', icon: FiCheckSquare, label: 'Tasks', roles: ['admin', 'marketing_head', 'developer', 'smm', 'crm_head', 'team_lead', 'employee'] },
    { href: '/dashboard/worklogs', icon: FiClock, label: 'Work Logs', roles: ['admin', 'marketing_head', 'developer', 'smm', 'crm_head', 'team_lead', 'employee'] },
    { href: '/dashboard/eod', icon: FiClock, label: 'EOD Report', roles: ['admin', 'marketing_head', 'developer', 'smm', 'crm_head', 'team_lead', 'employee'] },
    { href: '/dashboard/chat', icon: FiMessageSquare, label: 'Messenger', roles: ['admin', 'marketing_head', 'developer', 'smm', 'crm_head', 'client', 'team_lead', 'employee'] },
    { href: '/dashboard/documents', icon: FiFolder, label: 'Documents', roles: ['admin', 'marketing_head', 'developer', 'smm', 'crm_head', 'team_lead', 'employee'] },
    { href: '/dashboard/gdrive', icon: FiHardDrive, label: 'Google Drive', roles: ['admin', 'marketing_head', 'developer', 'smm', 'crm_head', 'team_lead', 'employee', 'crm'] },
    { href: '/dashboard/reports', icon: FiBarChart2, label: 'Reports', roles: ['admin', 'marketing_head', 'crm_head', 'team_lead'] },
    { 
      label: 'Attendance', 
      icon: FiCalendar, 
      roles: ['admin', 'marketing_head', 'developer', 'smm', 'crm_head', 'team_lead', 'employee'],
      subItems: [
        { href: '/dashboard/attendance', label: 'Mark Attendance' },
        { href: '/dashboard/calendar', label: 'Calendar' },
      ]
    },
    { href: '/dashboard/leaves',       icon: FiUmbrella,  label: 'Leave',         roles: ['admin', 'marketing_head', 'developer', 'smm', 'crm_head', 'team_lead', 'employee'] },
    { href: '/dashboard/salary',       icon: FiDollarSign, label: 'Salary',        roles: ['admin', 'marketing_head'] },
    { href: '/dashboard/finance',      icon: FiDollarSign, label: 'Finance',       roles: ['admin', 'crm_head', 'marketing_head'] },
    { href: '/dashboard/domains', icon: FiGlobe, label: 'Domains', roles: ['admin', 'crm_head', 'marketing_head', 'team_lead'], alert: domainAlertCount },
    { href: '/dashboard/permissions',  icon: FiShield,         label: 'Permissions',   roles: ['admin', 'marketing_head', 'developer', 'smm', 'crm_head', 'team_lead', 'employee'] },
    { href: '/dashboard/feedback',     icon: FiMessageSquare,  label: 'Feedback',      roles: ['admin', 'marketing_head', 'developer', 'smm', 'crm_head', 'team_lead', 'employee'] },
    { href: '/dashboard/analytics',    icon: FiPieChart,       label: 'HR Analytics',  roles: ['admin', 'marketing_head', 'crm_head', 'team_lead'] },
    { href: '/dashboard/activity',     icon: FiActivity,       label: 'Live Monitor',  roles: ['admin', 'marketing_head'] },
    { href: '/dashboard/settings',     icon: FiSettings,  label: 'Settings',      roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role || ''));

  useEffect(() => {
    // Auto-expand menu if sub-item is active
    navItems.forEach(item => {
      if (item.subItems?.some(sub => pathname === sub.href)) {
        setExpandedMenus(prev => Array.from(new Set([...prev, (item.label || '')])));
      }
    });
  }, [pathname]);

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    setDarkMode(!darkMode);
    localStorage.setItem('darkMode', (!darkMode).toString());
  };

  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const avatarColor = AVATAR_COLORS[(user?.name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const profileImgUrl = user?.profile_image
    ? (user.profile_image.startsWith('data:') ? user.profile_image : `${API_URL}/auth/profile/image/${user.profile_image}`)
    : null;
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [user?.profile_image]);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] lg:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`sidebar w-64 bg-sidebar dark:bg-sidebar h-screen fixed left-0 top-0 flex flex-col border-r border-sidebar-border z-[120] transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Close button for mobile */}
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-5 -right-12 p-2 bg-sidebar dark:bg-sidebar text-white rounded-r-xl lg:hidden shadow-xl"
        >
          <FiX size={20} />
        </button>

        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">KairaFlow</h1>
          </div>

          {/* User info */}
          <Link href="/dashboard/profile" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-2 -m-2 rounded-xl hover:bg-white/5 transition-all">
            <div className={`w-9 h-9 rounded-xl ${avatarColor} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
              {profileImgUrl && !imgError
                ? <img 
                    src={profileImgUrl} 
                    alt={user?.name} 
                    className="w-full h-full object-cover" 
                    crossOrigin="anonymous" 
                    onError={() => setImgError(true)}
                  />
                : <span className="text-white text-xs font-bold">{initials}</span>
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.team_name || user?.department_name || 'KairaFlow'}</p>
            </div>
          </Link>
          <span className={`mt-2.5 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${ROLE_COLORS[user?.role || ''] || ROLE_COLORS.employee}`}>
            {user?.role?.replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const hasSubItems = !!item.subItems;
            const isSubActive = hasSubItems && item.subItems?.some(sub => pathname === sub.href);
            const isActive = pathname === item.href || isSubActive;
            const isExpanded = expandedMenus.includes(item.label || '');

            return (
              <div key={item.label || item.href}>
                {hasSubItems ? (
                  <div className="space-y-0.5">
                    <div
                      onClick={() => toggleMenu(item.label || '')}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                        isActive ? 'text-white bg-white/10 border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon size={17} className={isActive ? 'text-primary-500 dark:text-gold' : ''} />
                      <span>{item.label}</span>
                      <span className="ml-auto text-gray-500">
                        {isExpanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="ml-9 space-y-1 mt-1 border-l border-white/5 pl-2 animate-slide-down">
                        {item.subItems?.map((sub) => {
                          const isSubItemActive = pathname === sub.href;
                          return (
                            <Link key={sub.href} href={sub.href} onClick={() => setIsOpen(false)}
                              className={`block py-1.5 px-3 text-xs rounded-lg transition-all duration-200 ${
                                isSubItemActive ? 'text-gold font-semibold bg-gold/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                              }`}
                            >
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link href={item.href || '#'} onClick={() => setIsOpen(false)}
                     className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                       isActive ? 'text-white bg-white/10 border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
                     }`}
                  >
                    <Icon size={17} className={isActive ? 'text-primary-500 dark:text-gold' : ''} />
                    <span>{item.label}</span>
                    {(item as any).alert > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                        {(item as any).alert}
                      </span>
                    )}
                    {isActive && !(item as any).alert && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-gold" />}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-white/5 space-y-0.5">
          <button onClick={toggleDarkMode}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-150"
          >
            {darkMode ? <FiSun size={17} /> : <FiMoon size={17} />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-150"
          >
            <FiLogOut size={17} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
