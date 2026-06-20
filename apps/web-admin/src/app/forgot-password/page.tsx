'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (!email) {
      setError('Please enter your email address.');
      setLoading(false);
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        throw new Error(resetError.message);
      }

      setMessage('A password reset link has been sent to your email address.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4 font-sans relative overflow-hidden">
      {/* Background glow meshes */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[450px] rounded-full bg-brand-600/5 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 h-[450px] w-[450px] rounded-full bg-brand-500/5 blur-[100px]" />
      </div>

      <div className="max-w-md w-full space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div 
            onClick={() => router.push('/')}
            className="inline-flex gap-3 items-center cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-brand-400 flex items-center justify-center font-extrabold text-white text-lg shadow-lg shadow-brand-500/25">
              QP
            </div>
            <div className="flex flex-col text-left">
              <span className="font-black text-slate-900 text-lg tracking-tight leading-none">
                Question <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-400">Papers</span>
              </span>
              <span className="text-[9px] font-bold text-slate-500 mt-0.5">Generator System</span>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            Reset Password
          </h1>
          <p className="text-slate-600 text-sm">
            Enter your email to receive a password reset link.
          </p>
        </div>

        <div className="border border-slate-200 rounded-3xl bg-white backdrop-blur-xl p-8 shadow-sm space-y-6">
          <form onSubmit={handleReset} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium text-left">
                ⚠️ {error}
              </div>
            )}
            {message && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-600 font-medium text-left">
                ✅ {message}
              </div>
            )}

            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="e.g. name@qgp.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-xl py-3 text-sm transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="pt-2 text-center border-t border-slate-200 text-sm flex justify-between">
            <button
              onClick={() => router.push('/login')}
              className="text-xs text-brand-600 hover:text-brand-700 transition-colors font-medium underline"
            >
              Back to Login
            </button>
            <button
              onClick={() => router.push('/')}
              className="text-xs text-brand-600 hover:text-brand-700 transition-colors font-medium underline"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
