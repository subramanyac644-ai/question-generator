'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';

export default function RegisterPage() {
  const router = useRouter();

  // Inputs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const role = 'STUDENT';

  // States
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Password Strength State
  const validatePasswordStrength = (pass: string) => {
    if (pass.length < 8) return 'Password must be at least 8 characters long';
    if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(pass)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(pass)) return 'Password must contain at least one number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return 'Password must contain at least one special character';
    return '';
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Basic Validations
    if (!fullName || !email || !password || !confirmPassword) {
      setError('All fields are required.');
      setLoading(false);
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    // Password strength validation
    const strengthError = validatePasswordStrength(password);
    if (strengthError) {
      setError(strengthError);
      setLoading(false);
      return;
    }

    // Password confirmation check
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      // Go directly to the NestJS backend — skip Supabase (key is not configured)
      const userId = crypto.randomUUID();

      const syncRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          email,
          name: fullName,
          role,
          departmentId: null,
          password,
        }),
      });

      const syncData = await syncRes.json();

      if (!syncRes.ok) {
        throw new Error(syncData.message || 'Registration failed. Please try again.');
      }

      setSuccess('Account created successfully! Redirecting to login page...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Make sure the backend API is running.');
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
            Create Your Account
          </h1>
          <p className="text-slate-600 text-sm">
            Sign up to create your platform profile.
          </p>
        </div>

        {/* Card Form container */}
        <div className="border border-slate-200 rounded-3xl bg-white backdrop-blur-xl p-8 shadow-sm space-y-6">
          <form onSubmit={handleRegister} className="space-y-4" autoComplete="off">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium text-left">
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-600 font-medium text-left">
                ✅ {success}
              </div>
            )}

            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="e.g. john.doe@qgp.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>



            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-xl py-3.5 text-sm transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Registering Account...' : 'Register'}
            </button>
          </form>

          <div className="pt-2 text-center border-t border-slate-200 text-sm">
            <span className="text-slate-600 text-xs">Already have an account? </span>
            <button
              onClick={() => router.push('/login')}
              className="text-xs text-brand-600 hover:text-brand-700 transition-colors font-bold underline ml-1"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
