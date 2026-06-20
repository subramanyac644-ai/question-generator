'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { TeacherProvider } from './TeacherContext';
import { useAuth } from '../AuthContext';

interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, session, loading, logout } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  useEffect(() => {
    if (session?.access_token && user?.role === 'TEACHER') {
      fetchNotifications();
    }
  }, [session, user]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const markNotificationsAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!user || user.role !== 'TEACHER') {
    if (typeof window !== 'undefined') {
      router.replace('/access-denied');
    }
    return null;
  }

  const steps = [
    { id: 'dashboard', label: 'Dashboard', path: '/teacher/dashboard', icon: '📊' },
    { id: 'mode', label: 'Modes', path: '/teacher/mode', icon: '🎯' },
  ];

  // Breadcrumb configuration
  const getBreadcrumbs = () => {
    const breadcrumbs = [{ label: 'Dashboard', path: '/teacher/dashboard' }];
    
    if (pathname.startsWith('/teacher/mode')) {
      breadcrumbs.push({ label: 'Modes', path: '/teacher/mode' });
    } else if (pathname.startsWith('/teacher/manual')) {
      breadcrumbs.push({ label: 'Modes', path: '/teacher/mode' });
      breadcrumbs.push({ label: 'Manual Mode', path: '/teacher/manual' });
    } else if (pathname.startsWith('/teacher/ai')) {
      breadcrumbs.push({ label: 'Modes', path: '/teacher/mode' });
      breadcrumbs.push({ label: 'AI Mode', path: '/teacher/ai' });
    }
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <TeacherProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-brand-500/10 bg-white/80 backdrop-blur-md px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div onClick={() => router.push('/teacher/dashboard')} className="flex items-center gap-3 cursor-pointer group">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center font-extrabold text-white text-lg bg-gradient-to-tr from-brand-600 via-brand-500 to-brand-400 shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
                QP
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-slate-900 text-base tracking-tight leading-none">
                    Teacher Dashboard
                  </span>
                </div>
                <span className="text-[10px] font-medium text-slate-500">Question Generation Engine</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Notification bell */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications && unreadCount > 0) {
                      markNotificationsAsRead();
                    }
                  }}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition relative"
                >
                  <span>🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 h-4 w-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-black animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm z-50 text-left space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-900">Notifications</span>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Close
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {notifications.length === 0 ? (
                        <p className="text-[11px] text-slate-500 text-center py-4">No notifications yet.</p>
                      ) : (
                        notifications.map(notif => (
                          <div
                            key={notif.id}
                            className={`p-2.5 rounded-lg border text-[11px] leading-relaxed transition ${
                              notif.read ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-brand-50 border-brand-200 text-brand-700'
                            }`}
                          >
                            <p>{notif.message}</p>
                            <span className="text-[9px] text-slate-500 block mt-1">
                              {new Date(notif.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <span className="text-sm text-slate-700 font-semibold">{user.name}</span>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-red-200 hover:bg-red-50 text-xs font-semibold text-slate-500 hover:text-red-600 transition"
              >
                Log Out
              </button>
            </div>
          </div>
        </header>

        {/* Breadcrumb Navigation */}
        <div className="border-b border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <nav className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.path}>
                  {index > 0 && (
                    <span className="text-slate-400">/</span>
                  )}
                  <button
                    onClick={() => router.push(crumb.path)}
                    className={`font-medium transition-colors ${
                      index === breadcrumbs.length - 1
                        ? 'text-brand-600 font-semibold'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {crumb.label}
                  </button>
                </React.Fragment>
              ))}
            </nav>
          </div>
        </div>

        {/* Navigation Stepper */}
        <div className="border-b border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-center gap-2 md:gap-8 overflow-x-auto">
            {steps.map((step) => {
              const isActive = pathname === step.path || pathname.startsWith(step.path + '/');
              
              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => router.push(step.path)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                      isActive 
                        ? 'bg-brand-50 text-brand-600 border border-brand-200 shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <span>{step.icon}</span>
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 md:px-8">
          {children}
        </main>
      </div>
    </TeacherProvider>
  );
}
