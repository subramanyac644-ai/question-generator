'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthContext';

export default function AccessDeniedPage() {
  const router = useRouter();
  const { logout, user } = useAuth();

  const handleLogoutAndRedirect = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4 font-sans relative overflow-hidden">
      {/* Background glow meshes */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[450px] rounded-full bg-red-500/10 blur-[100px]" />
      </div>

      <div className="max-w-md w-full space-y-6 text-center relative z-10">
        <div className="inline-flex h-16 w-16 rounded-full bg-red-50 border border-red-200 items-center justify-center text-3xl">
          🚫
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600">
            Access Denied
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            Your account ({user?.email || 'unauthorized'}) with the role of{' '}
            <strong className="text-slate-900">{user?.role || 'NONE'}</strong> does not have authorization permissions to access this dashboard.
          </p>
        </div>

        <div className="border border-slate-200 rounded-3xl bg-white backdrop-blur-xl p-8 shadow-sm space-y-4">
          <button
            onClick={() => router.push('/')}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold rounded-xl py-3 text-sm transition-all border border-slate-300"
          >
            Go to Home Page
          </button>
          
          <button
            onClick={handleLogoutAndRedirect}
            className="w-full bg-gradient-to-r from-red-650 to-rose-600 hover:from-red-550 hover:to-rose-500 text-white font-semibold rounded-xl py-3 text-sm transition-all shadow-lg shadow-red-900/20"
          >
            Sign In with Different Account
          </button>
        </div>
      </div>
    </div>
  );
}
