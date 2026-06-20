'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthContext';

export default function DashboardPortal() {
  const router = useRouter();
  const { user, session, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!session || !user) {
        router.replace('/login');
      } else {
        switch (user.role) {
          case 'PRINCIPAL':
            router.replace('/principal');
            break;
          case 'HOD':
            router.replace('/hod');
            break;
          case 'TEACHER':
            router.replace('/teacher');
            break;
          case 'STUDENT':
            router.replace('/student');
            break;
          default:
            router.replace('/');
        }
      }
    }
  }, [user, session, loading, router]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center font-sans">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
      <p className="mt-4 text-xs text-slate-600 font-medium">Redirecting to your dashboard console...</p>
    </div>
  );
}
