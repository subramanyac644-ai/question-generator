'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTeacherWorkflow } from '../TeacherContext';

export default function ModeSelectionPage() {
  const router = useRouter();
  const { setCreationMode } = useTeacherWorkflow();

  const handleSelectManual = () => {
    setCreationMode('MANUAL');
    router.push('/teacher/manual');
  };

  const handleSelectAI = () => {
    setCreationMode('AI');
    router.push('/teacher/ai');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16 max-w-4xl mx-auto">
      <div className="text-center space-y-4 pt-8">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900">
          Choose Creation Mode
        </h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Select how you want to create your question set. You can manually author questions 
          or let our AI generate them from your curriculum documents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
        {/* Manual Mode Card */}
        <button
          onClick={handleSelectManual}
          className="group relative text-left bg-white border-2 border-slate-200 hover:border-brand-500 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:shadow-brand-500/10 transition-all overflow-hidden flex flex-col h-full"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="text-8xl">✍️</span>
          </div>
          <div className="h-16 w-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center text-3xl mb-6 shadow-inner border border-brand-100 group-hover:scale-110 transition-transform">
            ✍️
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Manual Mode</h2>
          <p className="text-slate-500 leading-relaxed flex-grow">
            Create question papers manually by adding and managing questions yourself.
          </p>
          <div className="mt-6 flex items-center text-brand-600 font-semibold text-sm group-hover:translate-x-2 transition-transform">
            Create Manually <span className="ml-2">→</span>
          </div>
        </button>

        {/* AI Mode Card */}
        <button
          onClick={handleSelectAI}
          className="group relative text-left bg-white border-2 border-slate-200 hover:border-sky-500 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:shadow-sky-500/10 transition-all overflow-hidden flex flex-col h-full"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="text-8xl">⚡</span>
          </div>
          <div className="h-16 w-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center text-3xl mb-6 shadow-inner border border-sky-100 group-hover:scale-110 transition-transform">
            ⚡
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Using AI Mode</h2>
          <p className="text-slate-500 leading-relaxed flex-grow">
            Generate question papers automatically using AI from uploaded content or PDF files.
          </p>
          <div className="mt-6 flex items-center text-sky-600 font-semibold text-sm group-hover:translate-x-2 transition-transform">
            Generate Using AI <span className="ml-2">→</span>
          </div>
        </button>
      </div>
    </div>
  );
}
