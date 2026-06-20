'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTeacherWorkflow } from '../../TeacherContext';
import { useAuth } from '../../../AuthContext';

interface ExportStepProps {
  onFinish: () => void;
}

export default function ExportStep({ onFinish }: ExportStepProps) {
  const router = useRouter();
  const { session } = useAuth();
  const { generatedQuestions, config, creationMode } = useTeacherWorkflow();
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [error, setError] = useState('');

  if (generatedQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 bg-white">
        <p className="text-brand-500">No questions available to export.</p>
        <button
          onClick={() => alert('Please go back and generate questions first.')}
          className="px-6 py-2 bg-brand-50 text-brand-600 font-bold rounded-lg border border-brand-200 hover:bg-brand-100 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  const handleExport = async () => {
    setExporting(true);
    setError('');

    try {
      const payload = {
        title: `${config.topic} Assessment - ${config.type}`,
        description: `Quiz generated on the topic "${config.topic}" with ${config.difficulty} difficulty.`,
        difficulty: config.difficulty,
        type: config.type,
        timeLimitSeconds: (config.timeLimitMinutes || 30) * 60,
        testDuration: config.timeLimitMinutes || 30,
        startDate: config.startDate || null,
        endDate: config.endDate || null,
        sourceDocumentId: config.sourceDocumentId || null,
        negativeMarking: config.negativeMarking || 0,
        randomizeOrder: config.randomizeOrder || false,
        questionCreationMode: creationMode,
        questions: generatedQuestions,
      };

      const res = await fetch('/api/question-sets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = 'Failed to export assessment';
        try {
          const errData = JSON.parse(errorText);
          errorMessage = errData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      setExported(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred during export.');
      setExporting(false);
    }
  };

  if (exported) {
    router.push('/teacher/dashboard');
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto text-center space-y-8 animate-in zoom-in-95 duration-500 py-12 bg-white">
      <div className="space-y-4">
        <div className="mx-auto w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center border border-brand-200 shadow-sm shadow-brand-500/10">
          <span className="text-4xl">🎉</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-brand-900">
          Ready for Export
        </h2>
        <p className="text-brand-500">
          You have successfully configured, generated, and reviewed{' '}
          <strong className="text-brand-600">{generatedQuestions.length}</strong> questions
          {config.topic && (
            <> for the topic &quot;<strong className="text-brand-600">{config.topic}</strong>&quot;</>
          )}.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-bold max-w-md mx-auto">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left max-w-md mx-auto space-y-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">
          Payload Summary
        </h3>
        <div className="space-y-3">
          {config.type && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Type</span>
              <span className="font-mono text-brand-600 font-bold">{config.type}</span>
            </div>
          )}
          {config.difficulty && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Difficulty</span>
              <span className="font-mono text-amber-600 font-bold">{config.difficulty}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 font-medium">Total Questions</span>
            <span className="font-mono text-slate-800 font-bold">{generatedQuestions.length}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 font-medium">Total Marks</span>
            <span className="font-mono text-emerald-600 font-bold">
              {generatedQuestions.reduce((sum, q) => sum + (q.marks || 0), 0)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 font-medium">Time Limit</span>
            <span className="font-mono text-amber-600 font-bold">{config.timeLimitMinutes || 30} Minutes</span>
          </div>
          {config.startDate && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Start Time</span>
              <span className="font-mono text-violet-600 font-bold">{new Date(config.startDate).toLocaleString()}</span>
            </div>
          )}
          {config.endDate && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">End Time</span>
              <span className="font-mono text-rose-600 font-bold">{new Date(config.endDate).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 font-medium">Mode</span>
            <span className="font-mono text-indigo-600 font-bold">AI Generation</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="px-8 py-3 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-white shadow-md shadow-emerald-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
              Exporting...
            </span>
          ) : '✅ Export & Save'}
        </button>
      </div>
    </div>
  );
}
