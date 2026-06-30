'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshProfile } = useAuth();

  // Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // States
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to correct role dashboard immediately
  useEffect(() => {
    if (!authLoading && user) {
      redirectUser(user.role);
    }
  }, [user, authLoading, router]);

  const redirectUser = (role: string) => {
    switch (role) {
      case 'PRINCIPAL':
        router.replace('/principal/dashboard');
        break;
      case 'HOD':
        router.replace('/hod/dashboard');
        break;
      case 'TEACHER':
        router.replace('/teacher/dashboard');
        break;
      case 'STUDENT':
        router.replace('/student');
        break;
      default:
        router.replace('/');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let token = '';
      let profile: any = null;

      // 1. Try Supabase login first (if configured)
      try {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!loginError && data?.session) {
          token = data.session.access_token;
          const res = await fetch('/api/auth/profile', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            profile = await res.json();
          }
        }
      } catch {
        // Supabase failed for any reason — proceed to local DB fallback
      }

      // 2. Always fallback to local DB login if Supabase didn't produce a profile
      if (!profile) {
        let res: Response;
        try {
          res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
        } catch {
          throw new Error('Cannot reach the backend API. Make sure the API server is running on port 5000.');
        }

        if (!res.ok) {
          // Handle cases where Next.js proxy itself fails (502 Bad Gateway = API down)
          if (res.status === 502 || res.status === 503) {
            throw new Error('Backend API is not running. Please start the API server and try again.');
          }
          if (res.status === 500) {
             const errBody = await res.json().catch(() => ({}));
             throw new Error(`Internal Server Error (500): ${errBody.message || JSON.stringify(errBody)}`);
          }
          const errBody = await res.json().catch(() => ({}));
          const msg = errBody.message;
          throw new Error(
            Array.isArray(msg) ? msg.join(', ') : (msg || 'Invalid email or password. Please try again.')
          );
        }

        const fallbackData = await res.json();
        token = fallbackData.accessToken;
        profile = fallbackData.user;
      }

      localStorage.setItem('qgp_token', token);
      localStorage.setItem('qgp_user', JSON.stringify(profile));

      if (rememberMe) {
        localStorage.setItem('qgp_remember', 'true');
      }

      await refreshProfile();
      redirectUser(profile.role);
    } catch (err: any) {
      setError(err.message || 'Login failed. Make sure the backend API is running.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans overflow-hidden">
      {/* 1. Left Column: Split-screen Image Banner (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-white border-r border-slate-200 relative items-center justify-center p-12 overflow-hidden">
        {/* Glow and grid mesh background */}
        <div className="absolute inset-0 bg-slate-50/50 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-brand-600/10 blur-[120px]" />
        
        <div className="relative z-10 max-w-lg space-y-6 text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-200">
            ✨ Premium AI Exam Generator
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 leading-tight">
            Seamless Question Paper Orchestration
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Verify academic syllabus guidelines, parse complex textbook structures, map relational course models, and generate structured exams with advanced safety filters.
          </p>

          <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-4 hover:shadow-lg transition-shadow">
            <div className="flex gap-3 items-center">
              <span className="text-2xl">🤖</span>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Powered by Gemini 2.5</h4>
                <p className="text-xs text-slate-500">Fine-tuned schema models for multi-type question papers</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Right Column: Form Container */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 relative">
        <div className="absolute top-1/4 right-1/4 h-[350px] w-[350px] rounded-full bg-brand-500/5 blur-[90px] pointer-events-none" />

        <div className="max-w-md w-full space-y-8 relative z-10">
          <div className="flex justify-start">
            <button
              onClick={() => router.push('/')}
              className="group inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors bg-white hover:bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 shadow-sm"
            >
              <span className="text-sm transition-transform group-hover:-translate-x-0.5">←</span>
              Back to Home
            </button>
          </div>
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
              Sign In to Your Workspace
            </h1>
            <p className="text-slate-600 text-sm">
              Enter your credentials to manage question paper runs.
            </p>
          </div>

          {/* Form Card */}
          <div className="border border-slate-200 rounded-3xl bg-white backdrop-blur-xl p-8 shadow-sm space-y-6">
            <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium text-left">
                  ⚠️ {error}
                </div>
              )}

              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. cse.teacher@qgp.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                />
              </div>

              <div className="space-y-1 text-left">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => router.push('/forgot-password')}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Remember me and actions */}
              <div className="flex items-center justify-between py-1 text-left">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 text-xs select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 bg-white text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-xl py-3.5 text-sm transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>


            <div className="pt-2 text-center border-t border-slate-200 text-sm">
              <span className="text-slate-600 text-xs">Don't have an account? </span>
              <button
                onClick={() => router.push('/register')}
                className="text-xs text-brand-600 hover:text-brand-700 transition-colors font-bold underline ml-1"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
