'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { user, session } = useAuth();

  // State for statistics
  const [stats, setStats] = useState({
    totalPapers: 0,
    aiGeneratedPapers: 0,
    manualPapers: 0,
    recentPapers: [] as any[]
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Fetch statistics
  useEffect(() => {
    if (session?.access_token) {
      fetch('/api/assignments', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch assignments');
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data)) {
            const total = data.length;
            const aiGenerated = data.filter((a: any) => a.creationMode === 'AI').length;
            const manual = data.filter((a: any) => a.creationMode === 'MANUAL').length;
            const recent = data.slice(0, 5);
            
            setStats({
              totalPapers: total,
              aiGeneratedPapers: aiGenerated,
              manualPapers: manual,
              recentPapers: recent
            });
          }
        })
        .catch((err) => console.error('Error fetching statistics:', err))
        .finally(() => setLoadingStats(false));
    }
  }, [session]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-r from-brand-50 via-white to-sky-50 p-8 md:p-12 shadow-sm">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-80 w-80 rounded-full bg-brand-100 blur-3xl" />
        <div className="relative z-10 space-y-4 max-w-2xl text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-brand-100 text-brand-700 ring-1 ring-inset ring-brand-200">
            🍎 Teacher Dashboard
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 text-left">
            Welcome, {user?.name || 'Teacher'}!
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed text-left">
            View your question paper statistics and recent activity. Create new assessments using Manual Mode or AI Mode.
          </p>
        </div>
      </div>



      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => router.push('/teacher/mode')}
          className="group text-left border-2 border-slate-200 hover:border-brand-400 rounded-2xl bg-white hover:bg-brand-50 p-6 space-y-4 transition-all shadow-sm hover:shadow-md"
        >
          <div className="h-12 w-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            ✨
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Create New Question Paper</h3>
            <p className="text-xs text-slate-500 mt-1">Choose between Manual Mode or AI Mode to create assessments.</p>
          </div>
        </button>

        <button
          onClick={() => router.push('/teacher/mode')}
          className="group text-left border-2 border-slate-200 hover:border-emerald-400 rounded-2xl bg-white hover:bg-emerald-50 p-6 space-y-4 transition-all shadow-sm hover:shadow-md"
        >
          <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            📝
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Continue Working</h3>
            <p className="text-xs text-slate-500 mt-1">
              Resume editing your draft question papers.
            </p>
          </div>
        </button>
      </div>

      {/* Recently Created Question Papers */}
      <div className="mt-12 space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>📋</span> Recently Created Question Papers
        </h2>

        {loadingStats ? (
          <div className="border border-slate-200 bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500 mx-auto" />
            <p className="text-sm text-slate-500 mt-4 font-medium">Loading statistics...</p>
          </div>
        ) : stats.recentPapers.length === 0 ? (
          <div className="border border-slate-200 bg-slate-50 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
            <span className="text-3xl block mb-2">📁</span>
            No question papers created yet. Start by creating your first assessment!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stats.recentPapers.map((paper) => (
              <div
                key={paper.id}
                className="border border-slate-200 bg-white rounded-2xl p-6 flex flex-col justify-between hover:border-brand-300 transition shadow-sm hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{paper.title}</h3>
                    <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border ${
                      paper.difficulty === 'EASY' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : paper.difficulty === 'HARD'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {paper.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{paper.description}</p>
                  
                  <div className="flex gap-4 text-xs text-slate-500 font-medium pt-2 border-t border-slate-100">
                    <div>⏱️ {Math.round(paper.timeLimitSeconds / 60)} mins</div>
                    <div>❓ {paper.questions?.length || 0} Questions</div>
                    <div className={`font-semibold ${paper.creationMode === 'AI' ? 'text-sky-600' : 'text-brand-600'}`}>
                      {paper.creationMode === 'AI' ? '⚡ AI' : '✍️ Manual'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
