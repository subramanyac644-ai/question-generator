'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const isLoggedIn = !!user;

  const handleDashboardRedirect = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    switch (user.role) {
      case 'PRINCIPAL':
        router.push('/principal');
        break;
      case 'HOD':
        router.push('/hod');
        break;
      case 'TEACHER':
        router.push('/teacher');
        break;
      case 'STUDENT':
        router.push('/student');
        break;
      default:
        router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans relative overflow-hidden">
      {/* Background glowing meshes */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] h-[600px] w-[600px] rounded-full bg-brand-600/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[20%] h-[600px] w-[600px] rounded-full bg-brand-500/5 blur-[120px]" />
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-brand-400 flex items-center justify-center font-extrabold text-white text-lg shadow-lg shadow-brand-500/25">
              QP
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 text-lg tracking-tight leading-none">
                  Question <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-400">Papers</span>
                </span>
                <span className="text-[9px] font-bold tracking-widest text-brand-700 uppercase px-1.5 py-0.5 rounded border border-brand-200 bg-brand-50">
                  v2.0
                </span>
              </div>
              <span className="text-[10px] font-medium text-slate-500 tracking-wide mt-0.5">Generator System</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6 font-medium text-slate-600">
            <a href="/" className="hover:text-brand-600 transition-colors">Home</a>
            <a href="#features" className="hover:text-brand-600 transition-colors">Features</a>
            <a href="#about" className="hover:text-brand-600 transition-colors">About</a>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600 hidden sm:inline">
                  Welcome back, <strong className="text-slate-900">{user.name || 'User'}</strong>
                  <span className="ml-1.5 text-[8px] font-extrabold text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded border border-brand-200 uppercase">
                    {user.role}
                  </span>
                </span>
                <button
                  onClick={handleDashboardRedirect}
                  className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-lg px-4 py-2 text-xs transition-all shadow-md"
                >
                  Dashboard
                </button>
                <button
                  onClick={logout}
                  className="border border-slate-300 hover:border-red-500 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg px-3 py-2 text-xs font-semibold transition"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/login')}
                  className="border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg px-4 py-2 text-xs transition-all"
                >
                  Login
                </button>
                <button
                  onClick={() => router.push('/register')}
                  className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-lg px-4 py-2 text-xs transition-all shadow-md active:scale-95"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Public Landing Content */}
      <main className="flex-1 relative z-10">
        
        {/* HERO SECTION */}
        <section className="max-w-7xl mx-auto px-4 pt-20 pb-16 md:px-8 text-center space-y-8">
          <div className="space-y-4 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-200">
              🚀 Question Generator Platform v2.0
            </span>
            <h1 className="text-4xl sm:text-7xl font-black tracking-tight leading-tight flex flex-col items-center justify-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-brand-600 bg-brand-50 border border-brand-200 px-3 py-1 rounded-full mb-3">
                AI Orchestrator
              </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600">
                Generate Authentic
              </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400">
                Question Papers
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              A premium exam creation dashboard. Upload curriculum documents, parse magic-bytes, configure custom constraints, and render 7 unique question types in real-time.
            </p>
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <button
              onClick={handleDashboardRedirect}
              className="bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl px-8 py-3.5 text-sm transition-all shadow-lg shadow-brand-600/20 active:scale-95"
            >
              {user ? 'Go to Console' : 'Get Started Now'}
            </button>
            <a
              href="#features"
              className="border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl px-8 py-3.5 text-sm transition-all"
            >
              Explore Features
            </a>
          </div>

          {/* Interactive Mock Dashboard Preview Card */}
          <div className="pt-8 max-w-5xl mx-auto">
            <div className="border border-slate-200 rounded-2xl bg-white p-2 shadow-xl">
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 aspect-[16/9] flex flex-col justify-center items-center p-8 relative">
                <div className="absolute top-0 left-0 w-full h-full bg-slate-200/50 opacity-50 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]" />
                <div className="relative z-10 space-y-4 max-w-md">
                  <span className="text-3xl">🗂️</span>
                  <h3 className="text-lg font-bold text-slate-900">Interactive Preview Console</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Upload textbooks, syllabus sheets, or lecture slides. The platform parses text, runs guard rails for 20MB files, matches magic headers, and persists records.
                  </p>
                  <button
                    onClick={() => router.push(isLoggedIn ? '/dashboard' : '/login')}
                    className="border border-brand-200 hover:border-brand-300 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold px-4 py-2 rounded-lg transition"
                  >
                    Launch Demo Platform
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID SECTION */}
        <section id="features" className="border-t border-slate-200 bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-12">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Core System Architecture
              </h2>
              <p className="text-sm text-slate-600">
                Engineered with NestJS, Next.js, and Prisma running concurrently inside an Nx monorepo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="border border-slate-200 rounded-2xl bg-slate-50 p-6 space-y-4 hover:border-brand-300 transition text-left">
                <div className="h-10 w-10 rounded-xl bg-brand-100 border border-brand-200 flex items-center justify-center text-lg">
                  📂
                </div>
                <h3 className="font-bold text-slate-900">Secure PDF Upload</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  20MB file limit with strict magic-byte `%PDF` validation. Files are kept locally and mapped to department database IDs securely.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="border border-slate-200 rounded-2xl bg-slate-50 p-6 space-y-4 hover:border-brand-300 transition text-left">
                <div className="h-10 w-10 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center text-lg">
                  🧠
                </div>
                <h3 className="font-bold text-slate-900">7 Question Schema Types</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Generates Multiple Choice, Fill-in-the-Blanks, True/False, Match the Following, Sorting, Reordering, and Multi-Select question formats.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="border border-slate-200 rounded-2xl bg-slate-50 p-6 space-y-4 hover:border-brand-300 transition text-left">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-lg">
                  🛡️
                </div>
                <h3 className="font-bold text-slate-900">Role-Based Audit Trails</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Secured endpoints and JWT middlewares. Full action traceability for teachers, HODs, and school Principals.
                </p>
              </div>
            </div>
          </div>
        </section>


      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-600 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 Question Generator Monorepo Platform. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-brand-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-brand-600 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
