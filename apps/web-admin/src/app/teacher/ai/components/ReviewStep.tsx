'use client';

import React from 'react';
import { useTeacherWorkflow } from '../../TeacherContext';

interface ReviewStepProps {
  onNext: () => void;
}

export default function ReviewStep({ onNext }: ReviewStepProps) {
  const { generatedQuestions, updateQuestion, config } = useTeacherWorkflow();

  if (generatedQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <p className="text-slate-500">No questions generated yet.</p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-brand-50 text-brand-600 font-bold rounded-lg border border-brand-200 hover:bg-brand-100 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-brand-600 flex items-center gap-2">
          <span>👁️</span> Review & Edit ({config.type})
        </h2>
        <button
          onClick={onNext}
          className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 transition"
        >
          Approve & Continue to Export ➡️
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {generatedQuestions.map((q, index) => (
          <div key={q.id || index} className="border border-slate-200 bg-white shadow-sm rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <span className="bg-brand-50 border border-brand-200 text-brand-700 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                Q {index + 1}
              </span>
              <textarea
                value={q.question?.text || ''}
                onChange={(e) => {
                  const newQ = { ...q, question: { ...q.question, text: e.target.value } };
                  updateQuestion(index, newQ);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all min-h-[80px]"
              />
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                [{q.marks} Marks]
              </span>
            </div>

            <div className="pl-14 space-y-3">
              {q.options && q.options.map((opt: any, oIndex: number) => (
                 <div key={oIndex} className="flex items-center gap-3">
                   <div className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                     {String.fromCharCode(65 + oIndex)}
                   </div>
                   <input
                     value={opt.text}
                     onChange={(e) => {
                       const newOptions = [...q.options];
                       newOptions[oIndex].text = e.target.value;
                       updateQuestion(index, { ...q, options: newOptions });
                     }}
                     className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                   />
                 </div>
              ))}
              
              <div className="mt-4 pt-4 border-t border-slate-100">
                <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-2">Correct Answer(s) / Expected Output</label>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 font-medium">
                  {JSON.stringify(q.correctAnswer)}
                </div>
              </div>

              <div className="mt-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Explanation / Rationale</label>
                <textarea
                  value={q.explanation || ''}
                  onChange={(e) => updateQuestion(index, { ...q, explanation: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all min-h-[60px]"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
