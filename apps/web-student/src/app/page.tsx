import React from 'react';
import { Button, Card, Header } from '@qgp/shared-ui';

export default function StudentPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <Header appName="Student Hub" themeColor="border-violet-500/20 bg-violet-950/20" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 md:px-8 space-y-8">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-950/30 via-purple-950/20 to-zinc-900/40 p-8 md:p-12 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
          
          <div className="relative z-10 space-y-4 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-violet-500/10 text-violet-400 ring-1 ring-inset ring-violet-500/20">
              Active Session
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-violet-100 to-violet-300">
              Personalized Practice Arena
            </h1>
            <p className="text-sm md:text-base text-zinc-400 leading-relaxed">
              Generate instant questions on any topic in real-time. Practice multi-choice question formats, write test code suites, and improve your performance report metrics.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="primary">Start Practice Session</Button>
              <Button variant="outline">View Performance Metrics</Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card title="Quizzes Completed" value="34" change="+5 this week" icon="🎓" />
          <Card title="Average Score" value="84%" change="Top 10% on platform" icon="📈" />
          <Card title="Time Spent Practicing" value="12.5 hrs" change="Active streak: 4 days" icon="⏳" />
          <Card title="Concept Badges" value="7 earned" change="Next: JavaScript Master" icon="🏆" />
        </div>

        {/* Topic Selector & Available Assignments */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold tracking-tight text-violet-400 flex items-center gap-2">
              <span>🧠</span> AI Topic Practice Generator
            </h2>
            <div className="border border-zinc-800 rounded-2xl bg-zinc-900/50 p-6 space-y-4 backdrop-blur-md">
              <p className="text-sm text-zinc-400">Select an area and let the engine customize questions for you.</p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-950/60 hover:border-violet-500/40 transition cursor-pointer">
                  <h4 className="font-semibold text-zinc-200">Data Structures</h4>
                  <p className="text-xs text-zinc-500">Trees, Graphs, HashTables</p>
                </div>
                <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-950/60 hover:border-violet-500/40 transition cursor-pointer">
                  <h4 className="font-semibold text-zinc-200">Modern Databases</h4>
                  <p className="text-xs text-zinc-500">PostgreSQL, Indexing, ACID</p>
                </div>
                <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-950/60 hover:border-violet-500/40 transition cursor-pointer">
                  <h4 className="font-semibold text-zinc-200">Web Development</h4>
                  <p className="text-xs text-zinc-500">React, Next.js hydration, CSS Grid</p>
                </div>
                <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-950/60 hover:border-violet-500/40 transition cursor-pointer">
                  <h4 className="font-semibold text-zinc-200">Software Architecture</h4>
                  <p className="text-xs text-zinc-500">Design Patterns, Monorepos, CI/CD</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight text-violet-400 flex items-center gap-2">
              <span>📅</span> Active Assignments
            </h2>
            <div className="border border-zinc-800 rounded-2xl bg-zinc-900/50 p-6 space-y-4 backdrop-blur-md">
              <div className="text-sm space-y-4">
                <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
                  <div>
                    <span className="font-semibold text-zinc-200 block">Algorithms Quiz 2</span>
                    <span className="text-xs text-zinc-500">Due: Tomorrow, 23:59</span>
                  </div>
                  <span className="text-xs font-semibold text-rose-400 bg-rose-950/30 px-2.5 py-0.5 rounded-full">Required</span>
                </div>
                <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
                  <div>
                    <span className="font-semibold text-zinc-200 block">Database Joins Drill</span>
                    <span className="text-xs text-zinc-500">Due: June 20, 2026</span>
                  </div>
                  <span className="text-xs font-semibold text-zinc-400 bg-zinc-800 px-2.5 py-0.5 rounded-full">Optional</span>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold text-zinc-200 block">TypeScript Generics</span>
                    <span className="text-xs text-zinc-500">Completed (Score: 90%)</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/30 px-2.5 py-0.5 rounded-full">Done</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
