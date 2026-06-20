'use client';

import React, { useState, useEffect } from 'react';
import { useTeacherWorkflow } from '../../TeacherContext';
import { QuestionType } from '@qgp/question-schema';
import { useAuth } from '../../../AuthContext';

interface QuestionRow {
  type: QuestionType;
  label: string;
  icon: string;
  enabled: boolean;
  count: number;
  marks: number;
}

interface GenerateStepProps {
  onNext: () => void;
}

export default function GenerateStep({ onNext }: GenerateStepProps) {
  const { session } = useAuth();
  const { config, setConfig, setGeneratedQuestions } = useTeacherWorkflow();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // 1. Topic
  const [topic, setTopic] = useState('');

  // 2. Question Configuration rows
  const [rows, setRows] = useState<QuestionRow[]>([
    { type: QuestionType.multipleChoice, label: 'Multiple Choice Questions (MCQ)', icon: '📖', enabled: true, count: 10, marks: 1 },
    { type: QuestionType.multiSelect, label: 'Multi-Select Questions', icon: '📝', enabled: true, count: 5, marks: 2 },
    { type: QuestionType.fillInBlanks, label: 'Fill in the Blanks', icon: '✏️', enabled: true, count: 5, marks: 1 },
    { type: QuestionType.trueFalse, label: 'True / False', icon: '⚖️', enabled: true, count: 5, marks: 1 },
    { type: QuestionType.matchTheFollowing, label: 'Match the Following', icon: '🔀', enabled: true, count: 5, marks: 2 },
    { type: QuestionType.reordering, label: 'Reordering', icon: '🔃', enabled: true, count: 5, marks: 2 },
    { type: QuestionType.sorting, label: 'Sorting', icon: '📊', enabled: true, count: 4, marks: 2 },
  ]);

  // 3. Difficulty Distribution percentages
  const [difficulty, setDifficulty] = useState({
    easy: 40,
    medium: 40,
    hard: 20,
  });

  // 4. Time & Exam Settings
  const [duration, setDuration] = useState(120);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [negativeMarking, setNegativeMarking] = useState(0);
  const [randomizeOrder, setRandomizeOrder] = useState(true);

  // Initialize page topic from context if set
  useEffect(() => {
    if (config.topic) {
      setTopic(config.topic);
    }
  }, [config.topic]);

  // Load uploaded document from localStorage
  useEffect(() => {
    const docId = localStorage.getItem('qgp_upload_docId');
    const docTitle = localStorage.getItem('qgp_upload_docTitle');
    if (docId) {
      setConfig({ sourceDocumentId: docId, sourceDocumentTitle: docTitle });
    }
  }, []);

  // Update a specific row parameter
  const updateRow = (type: QuestionType, field: keyof QuestionRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => (r.type === type ? { ...r, [field]: value } : r))
    );
  };

  // Auto-balancing difficulty percentage sliders so they always sum to 100%
  const handleDifficultyChange = (key: 'easy' | 'medium' | 'hard', value: number) => {
    const val = Math.min(100, Math.max(0, value));
    const otherKeys = ['easy', 'medium', 'hard'].filter((k) => k !== key) as ('easy' | 'medium' | 'hard')[];
    const remaining = 100 - val;
    const sumOthers = difficulty[otherKeys[0]] + difficulty[otherKeys[1]];

    const newDiff = { ...difficulty, [key]: val };
    if (sumOthers > 0) {
      newDiff[otherKeys[0]] = Math.round((difficulty[otherKeys[0]] / sumOthers) * remaining);
      newDiff[otherKeys[1]] = 100 - val - newDiff[otherKeys[0]];
    } else {
      newDiff[otherKeys[0]] = Math.round(remaining / 2);
      newDiff[otherKeys[1]] = remaining - newDiff[otherKeys[0]];
    }
    setDifficulty(newDiff);
  };

  // Summary calculations
  const enabledRows = rows.filter((r) => r.enabled);
  const totalQuestions = enabledRows.reduce((sum, r) => sum + r.count, 0);
  const totalMarks = enabledRows.reduce((sum, r) => sum + r.count * r.marks, 0);

  const easyQuestions = Math.round((difficulty.easy / 100) * totalQuestions);
  const mediumQuestions = Math.round((difficulty.medium / 100) * totalQuestions);
  const hardQuestions = Math.max(0, totalQuestions - easyQuestions - mediumQuestions);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setGenerating(true);

    if (totalQuestions <= 0) {
      setError('Please enable at least one question type and enter a count.');
      setGenerating(false);
      return;
    }

    try {
      const resolvedTopic = config.sourceDocumentId ? '' : topic;
      const payload = {
        topic: resolvedTopic,
        sourceDocumentId: config.sourceDocumentId || undefined,
        configs: enabledRows.map((r) => ({
          type: r.type,
          count: r.count,
          marksPerQuestion: r.marks,
        })),
        difficultyDistribution: difficulty,
        timeLimitMinutes: duration,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        negativeMarking,
        randomizeOrder,
      };

      const res = await fetch('/api/generate/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Server error (${res.status}): ${responseText || 'No response details'}`);
      }

      if (!res.ok) {
        throw new Error(data.message || 'Failed to generate questions');
      }

      if (data.success && data.questions) {
        // Update context with configuration details for review & export
        setConfig({
          topic: resolvedTopic,
          timeLimitMinutes: duration,
          startDate,
          endDate,
          negativeMarking,
          randomizeOrder,
          // Set primary type/difficulty from first enabled row for backward compatibility
          type: enabledRows[0]?.type || QuestionType.multipleChoice,
          difficulty: 'MEDIUM',
        });
        setGeneratedQuestions(data.questions);
        onNext();
      } else {
        throw new Error(data.message || 'Generation returned no questions');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during generation');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-600 flex items-center gap-2">
            <span>⚡</span> Create & Configure Question Paper
          </h2>
          <p className="text-slate-500 text-sm mt-1">Specify topics, question types, difficulty, and exam rules.</p>
        </div>
        {config.sourceDocumentId && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-50 border border-brand-200 text-sm text-brand-700 font-semibold shadow-sm">
            <span>📄</span>
            <span>Generating from: <strong className="text-brand-900">Uploaded PDF</strong></span>
            <button
              onClick={() => {
                localStorage.removeItem('qgp_upload_docId');
                localStorage.removeItem('qgp_upload_docTitle');
                setConfig({ sourceDocumentId: null, sourceDocumentTitle: null });
              }}
              className="ml-auto text-[10px] text-brand-600 hover:text-brand-800 transition"
            >
              ✕ Clear
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-bold">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleGenerate} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Middle Column (Main config blocks) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. Topic / Concept */}
          {!config.sourceDocumentId && (
            <div className="border border-slate-200 rounded-2xl bg-white shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-brand-600 border-b border-slate-100 pb-2 flex items-center gap-2">
                <span className="text-brand-500 font-extrabold">1.</span> Topic / Concept
              </h3>
              <div className="space-y-2">
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter multiple topics / concepts separated by commas"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-sm font-medium"
                />
                <span className="text-[10px] text-slate-500 block text-left">
                  Enter multiple topics / concepts separated by commas
                </span>
              </div>
            </div>
          )}

          {/* 2. Question Configuration */}
          <div className="border border-slate-200 rounded-2xl bg-white shadow-sm p-6 space-y-4 overflow-hidden">
            <h3 className="text-sm font-bold text-brand-600 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="text-brand-500 font-extrabold">2.</span> Question Configuration
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                    <th className="px-4 py-3 w-16 text-center">Enable</th>
                    <th className="px-4 py-3">Question Type</th>
                    <th className="px-4 py-3 text-center w-36">Number of Questions</th>
                    <th className="px-4 py-3 text-center w-36">Marks per Questions</th>
                    <th className="px-4 py-3 text-right w-24">Total Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                  {rows.map((row) => (
                    <tr
                      key={row.type}
                      className={`transition-colors hover:bg-slate-50 ${row.enabled ? '' : 'opacity-40'}`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={row.enabled}
                          onChange={(e) => updateRow(row.type, 'enabled', e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                      <td className="px-4 py-3.5 flex items-center gap-2.5 font-bold text-slate-800">
                        <span className="text-base">{row.icon}</span>
                        <span>{row.label}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1.5 bg-slate-100 rounded-lg p-1 max-w-[120px] mx-auto">
                          <button
                            type="button"
                            disabled={!row.enabled || row.count <= 1}
                            onClick={() => updateRow(row.type, 'count', row.count - 1)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-white border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-300 disabled:opacity-50 font-bold shadow-sm"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            disabled={!row.enabled}
                            value={row.count}
                            onChange={(e) => updateRow(row.type, 'count', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-10 bg-transparent border-0 p-0 text-center focus:ring-0 text-slate-900 text-xs font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            disabled={!row.enabled}
                            onClick={() => updateRow(row.type, 'count', row.count + 1)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-white border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-300 disabled:opacity-50 font-bold shadow-sm"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1.5 bg-slate-100 rounded-lg p-1 max-w-[120px] mx-auto">
                          <button
                            type="button"
                            disabled={!row.enabled || row.marks <= 1}
                            onClick={() => updateRow(row.type, 'marks', row.marks - 1)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-white border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-300 disabled:opacity-50 font-bold shadow-sm"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            disabled={!row.enabled}
                            value={row.marks}
                            onChange={(e) => updateRow(row.type, 'marks', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-10 bg-transparent border-0 p-0 text-center focus:ring-0 text-slate-900 text-xs font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            disabled={!row.enabled}
                            onClick={() => updateRow(row.type, 'marks', row.marks + 1)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-white border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-300 disabled:opacity-50 font-bold shadow-sm"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-700">
                        {row.enabled ? row.count * row.marks : 0}
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-900">
                    <td colSpan={2} className="px-4 py-4 text-left">Total</td>
                    <td className="px-4 py-4 text-center text-brand-600">{totalQuestions}</td>
                    <td className="px-4 py-4 text-center"></td>
                    <td className="px-4 py-4 text-right text-brand-600">{totalMarks} Marks</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 3. Difficulty Distribution */}
            <div className="border border-slate-200 rounded-2xl bg-white shadow-sm p-6 space-y-5">
              <h3 className="text-sm font-bold text-brand-600 border-b border-slate-100 pb-2 flex items-center gap-2">
                <span className="text-brand-500 font-extrabold">3.</span> Difficulty Distribution
              </h3>

              <div className="space-y-4">
                {/* Easy */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Easy
                    </span>
                    <span className="text-slate-500">{easyQuestions} Questions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={difficulty.easy}
                      onChange={(e) => handleDifficultyChange('easy', parseInt(e.target.value))}
                      className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-mono w-14 justify-end">
                      <span>{difficulty.easy}%</span>
                    </div>
                  </div>
                </div>

                {/* Medium */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-500" /> Medium
                    </span>
                    <span className="text-slate-500">{mediumQuestions} Questions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={difficulty.medium}
                      onChange={(e) => handleDifficultyChange('medium', parseInt(e.target.value))}
                      className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-mono w-14 justify-end">
                      <span>{difficulty.medium}%</span>
                    </div>
                  </div>
                </div>

                {/* Hard */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Hard
                    </span>
                    <span className="text-slate-500">{hardQuestions} Questions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={difficulty.hard}
                      onChange={(e) => handleDifficultyChange('hard', parseInt(e.target.value))}
                      className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-mono w-14 justify-end">
                      <span>{difficulty.hard}%</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-500">
                  <span>Total</span>
                  <div className="flex gap-4">
                    <span>100%</span>
                    <span className="text-brand-600">{totalQuestions} Questions</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Time & Exam Settings */}
            <div className="border border-slate-200 rounded-2xl bg-white shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-brand-600 border-b border-slate-100 pb-2 flex items-center gap-2">
                <span className="text-brand-500 font-extrabold">4.</span> Time & Exam Settings
              </h3>

              <div className="space-y-3.5 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Total Exam Duration (minutes) *
                  </label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus-within:ring-2 focus-within:ring-brand-500 focus-within:bg-white transition-all">
                    <input
                      type="number"
                      min="1"
                      required
                      value={duration}
                      onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-transparent border-0 p-0 text-slate-900 focus:ring-0 focus:outline-none"
                    />
                    <span className="text-slate-500 text-xs font-bold ml-2">min</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Negative Marking (Optional)
                  </label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus-within:ring-2 focus-within:ring-brand-500 focus-within:bg-white transition-all">
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={negativeMarking}
                      onChange={(e) => setNegativeMarking(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-transparent border-0 p-0 text-slate-900 focus:ring-0 focus:outline-none"
                    />
                    <span className="text-slate-500 text-xs font-bold ml-2">marks</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Randomize Question Order
                  </span>
                  <input
                    type="checkbox"
                    checked={randomizeOrder}
                    onChange={(e) => setRandomizeOrder(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Summary sidebar) */}
        <div className="space-y-6">
          <div className="border border-slate-200 rounded-2xl bg-white shadow-sm p-6 space-y-6 sticky top-6 text-left">
            <h3 className="text-sm font-bold text-brand-600 border-b border-slate-100 pb-2 flex items-center gap-2">
              📄 Summary
            </h3>

            {/* Total Questions Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center text-xl">
                ⏱️
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Questions</p>
                <p className="text-2xl font-extrabold text-slate-900">{totalQuestions}</p>
              </div>
            </div>

            {/* Total Marks Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xl">
                🏆
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Marks</p>
                <p className="text-2xl font-extrabold text-slate-900">{totalMarks}</p>
              </div>
            </div>

            {/* Estimated Duration Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-xl">
                ⏳
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estimated Duration</p>
                <p className="text-2xl font-extrabold text-slate-900">{duration} min</p>
              </div>
            </div>

            {/* Difficulty Breakdown (Custom concentric / bar breakdown matching image) */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Difficulty Breakdown</p>
              
              {/* Progress-style visualizer */}
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div style={{ width: `${difficulty.easy}%` }} className="bg-emerald-500 h-full transition-all duration-300" title={`Easy: ${difficulty.easy}%`} />
                <div style={{ width: `${difficulty.medium}%` }} className="bg-brand-500 h-full transition-all duration-300" title={`Medium: ${difficulty.medium}%`} />
                <div style={{ width: `${difficulty.hard}%` }} className="bg-red-500 h-full transition-all duration-300" title={`Hard: ${difficulty.hard}%`} />
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-500">
                <div className="flex flex-col items-center p-2 bg-slate-50 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-emerald-600 font-bold">Easy</span>
                  <span className="text-slate-800 font-bold mt-0.5">{difficulty.easy}%</span>
                  <span className="text-slate-500 text-[9px]">{easyQuestions} Qs</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-slate-50 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-brand-600 font-bold">Medium</span>
                  <span className="text-slate-800 font-bold mt-0.5">{difficulty.medium}%</span>
                  <span className="text-slate-500 text-[9px]">{mediumQuestions} Qs</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-slate-50 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-red-600 font-bold">Hard</span>
                  <span className="text-slate-800 font-bold mt-0.5">{difficulty.hard}%</span>
                  <span className="text-slate-500 text-[9px]">{hardQuestions} Qs</span>
                </div>
              </div>
            </div>

            {/* Question Types Selected */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question Types Selected</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold">
                  ✓
                </span>
                <span className="text-slate-700 font-bold">
                  {enabledRows.length} / {rows.length} question types included
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl py-4 text-sm transition-all shadow-md shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                  Generating...
                </span>
              ) : (
                '⚡ Generate Question Paper'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
