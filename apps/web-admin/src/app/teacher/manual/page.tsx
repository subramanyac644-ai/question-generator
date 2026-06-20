'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTeacherWorkflow } from '../TeacherContext';
import { useAuth } from '../../AuthContext';
import { QuestionType, Difficulty } from '@qgp/question-schema';

type AnyQuestionType = 'fillInBlanks' | 'multipleChoice' | 'multiSelect' | 'matchTheFollowing' | 'reordering' | 'sorting' | 'trueFalse';

export default function ManualCreationPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { generatedQuestions, setGeneratedQuestions, config, setConfig } = useTeacherWorkflow();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const handleExport = async () => {
    if (generatedQuestions.length === 0) return;
    setExporting(true);
    setExportError('');
    try {
      const totalMarks = generatedQuestions.reduce((sum: number, q: any) => sum + (q.marks || 1), 0);
      const payload = {
        title: config.topic ? `${config.topic} - Manual Assessment` : 'Manual Assessment',
        description: `Manually created question paper with ${generatedQuestions.length} questions.`,
        difficulty: config.difficulty || 'MEDIUM',
        type: generatedQuestions[0]?.type || 'multipleChoice',
        timeLimitSeconds: (config.timeLimitMinutes || 30) * 60,
        testDuration: config.timeLimitMinutes || 30,
        startDate: config.startDate || null,
        endDate: config.endDate || null,
        sourceDocumentId: null,
        negativeMarking: config.negativeMarking || 0,
        randomizeOrder: config.randomizeOrder || false,
        questionCreationMode: 'MANUAL',
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
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Export failed');
      }
      setGeneratedQuestions([]);
      router.push('/teacher/dashboard');
    } catch (err: any) {
      setExportError(err.message || 'Export failed');
      setExporting(false);
    }
  };
  
  const [activeType, setActiveType] = useState<AnyQuestionType>('multipleChoice');
  
  // Common Fields
  const [prompt, setPrompt] = useState('');
  const [marks, setMarks] = useState(1);
  const [explanation, setExplanation] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  
  // Specific Fields
  const [tfAnswer, setTfAnswer] = useState<boolean>(true);
  const [fibAnswer, setFibAnswer] = useState('');
  const [fibAlts, setFibAlts] = useState('');
  
  const [mcqOptions, setMcqOptions] = useState<string[]>(['', '', '', '']);
  const [mcqCorrectIndex, setMcqCorrectIndex] = useState<number>(0);
  
  const [msOptions, setMsOptions] = useState<string[]>(['', '', '', '']);
  const [msCorrectIndices, setMsCorrectIndices] = useState<number[]>([]);
  
  const [matchPairs, setMatchPairs] = useState<{left: string, right: string}[]>([{left: '', right: ''}, {left: '', right: ''}]);
  
  const [reorderItems, setReorderItems] = useState<string[]>(['', '', '']);
  
  const [sortCategories, setSortCategories] = useState<string[]>(['Category 1', 'Category 2']);
  const [sortItems, setSortItems] = useState<{text: string, category: string}[]>([{text: '', category: 'Category 1'}]);

  const resetForm = () => {
    setPrompt('');
    setExplanation('');
    setMarks(1);
    setTfAnswer(true);
    setFibAnswer('');
    setFibAlts('');
    setMcqOptions(['', '', '', '']);
    setMcqCorrectIndex(0);
    setMsOptions(['', '', '', '']);
    setMsCorrectIndices([]);
    setMatchPairs([{left: '', right: ''}, {left: '', right: ''}]);
    setReorderItems(['', '', '']);
    setSortCategories(['Category 1', 'Category 2']);
    setSortItems([{text: '', category: 'Category 1'}]);
  };

  const handleAddQuestion = () => {
    if (!prompt.trim()) {
      alert('Question prompt is required.');
      return;
    }

    const baseQuestion: any = {
      type: activeType,
      difficulty,
      prompt,
      marks,
      explanation,
      content: {
        question: { text: prompt, hide_text: false, read_text: true, image: '' },
        marks,
        explanation
      }
    };

    if (activeType === 'trueFalse') {
      baseQuestion.content.correctAnswer = tfAnswer;
    } else if (activeType === 'fillInBlanks') {
      if (!fibAnswer.trim()) return alert('Correct answer is required');
      baseQuestion.content.correctAnswer = fibAnswer.trim();
      baseQuestion.content.alternatives = fibAlts.split(',').map(s => s.trim()).filter(Boolean);
    } else if (activeType === 'multipleChoice') {
      const validOptions = mcqOptions.filter(o => o.trim());
      if (validOptions.length < 2) return alert('At least 2 options required');
      if (!validOptions[mcqCorrectIndex]) return alert('Correct option must be valid');
      
      baseQuestion.content.options = validOptions.map(t => ({ text: t, hide_text: false, read_text: true, image: '' }));
      baseQuestion.content.correctAnswer = validOptions[mcqCorrectIndex];
    } else if (activeType === 'multiSelect') {
      const validOptions = msOptions.filter(o => o.trim());
      if (validOptions.length < 2) return alert('At least 2 options required');
      if (msCorrectIndices.length === 0) return alert('Select at least one correct answer');
      
      baseQuestion.content.options = validOptions.map(t => ({ text: t, hide_text: false, read_text: true, image: '' }));
      baseQuestion.content.correctAnswers = msCorrectIndices.map(i => msOptions[i]).filter(Boolean);
    } else if (activeType === 'matchTheFollowing') {
      const validPairs = matchPairs.filter(p => p.left.trim() && p.right.trim());
      if (validPairs.length < 2) return alert('At least 2 matching pairs required');
      baseQuestion.content.leftItems = validPairs.map(p => ({ text: p.left, hide_text: false, read_text: true, image: '' }));
      baseQuestion.content.rightItems = validPairs.map(p => ({ text: p.right, hide_text: false, read_text: true, image: '' }));
      // The implicit mapping is 1-to-1 matching index
    } else if (activeType === 'reordering') {
      const validItems = reorderItems.filter(i => i.trim());
      if (validItems.length < 2) return alert('At least 2 items required');
      baseQuestion.content.items = validItems.map(i => ({ text: i, hide_text: false, read_text: true, image: '' }));
      baseQuestion.content.correctSequence = [...validItems];
    } else if (activeType === 'sorting') {
      const validCats = sortCategories.filter(c => c.trim());
      const validItems = sortItems.filter(i => i.text.trim() && i.category.trim());
      if (validCats.length < 2) return alert('At least 2 categories required');
      if (validItems.length < 1) return alert('At least 1 item required');
      baseQuestion.content.categories = validCats;
      baseQuestion.content.items = validItems;
    }

    setGeneratedQuestions([...generatedQuestions, baseQuestion]);
    resetForm();
  };

  const handleRemoveQuestion = (idx: number) => {
    setGeneratedQuestions(generatedQuestions.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto py-8">
      
      {/* Left Column: Form Builder */}
      <div className="flex-1 space-y-6">
        
        {/* Settings Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-brand-600">4. Time & Exam Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Exam Duration (Minutes) *</label>
              <div className="relative">
                <input 
                  type="number" min={1}
                  value={config.timeLimitMinutes}
                  onChange={(e) => setConfig({ timeLimitMinutes: Number(e.target.value) })}
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none pr-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">min</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Start Date & Time</label>
                <input 
                  type="datetime-local"
                  value={config.startDate}
                  onChange={(e) => setConfig({ startDate: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-sm text-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">End Date & Time</label>
                <input 
                  type="datetime-local"
                  value={config.endDate}
                  onChange={(e) => setConfig({ endDate: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-sm text-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Negative Marking (Optional)</label>
              <div className="relative">
                <input 
                  type="number" min={0} step={0.25}
                  value={config.negativeMarking}
                  onChange={(e) => setConfig({ negativeMarking: Number(e.target.value) })}
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">marks</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="text-sm font-bold text-slate-600 uppercase tracking-wider">Randomize Question Order</label>
              <input 
                type="checkbox"
                checked={config.randomizeOrder}
                onChange={(e) => setConfig({ randomizeOrder: e.target.checked })}
                className="w-5 h-5 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Question Builder Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-900">Add Question</h2>
          <select 
            value={activeType}
            onChange={(e) => {
              setActiveType(e.target.value as AnyQuestionType);
              resetForm();
            }}
            className="px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-semibold focus:ring-2 focus:ring-brand-500 outline-none"
          >
            <option value="multipleChoice">Multiple Choice</option>
            <option value="fillInBlanks">Fill In Blanks</option>
            <option value="multiSelect">Multi Select</option>
            <option value="trueFalse">True / False</option>
            <option value="matchTheFollowing">Match The Following</option>
            <option value="reordering">Reordering</option>
            <option value="sorting">Sorting</option>
          </select>
        </div>

        {/* Common Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Question Prompt *</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
              rows={3}
              placeholder="Enter your question here..."
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Marks</label>
              <input 
                type="number" min={1}
                value={marks} onChange={(e) => setMarks(Number(e.target.value))}
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Difficulty</label>
              <select 
                value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value={Difficulty.EASY}>Easy</option>
                <option value={Difficulty.MEDIUM}>Medium</option>
                <option value={Difficulty.HARD}>Hard</option>
              </select>
            </div>
          </div>
        </div>

        {/* Type Specific Form */}
        <div className="p-4 bg-brand-50/50 rounded-2xl border border-brand-100 space-y-4">
          
          {activeType === 'multipleChoice' && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">Options (Select the correct one)</label>
              {mcqOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input 
                    type="radio" name="mcqCorrect"
                    checked={mcqCorrectIndex === idx}
                    onChange={() => setMcqCorrectIndex(idx)}
                    className="w-5 h-5 text-brand-600 border-slate-300 focus:ring-brand-500"
                  />
                  <input 
                    type="text" value={opt}
                    onChange={(e) => {
                      const newOpts = [...mcqOptions];
                      newOpts[idx] = e.target.value;
                      setMcqOptions(newOpts);
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-brand-500"
                  />
                  {idx > 1 && (
                    <button onClick={() => setMcqOptions(mcqOptions.filter((_, i) => i !== idx))} className="text-red-500 font-bold px-2">✕</button>
                  )}
                </div>
              ))}
              <button onClick={() => setMcqOptions([...mcqOptions, ''])} className="text-sm font-semibold text-brand-600 hover:text-brand-700">+ Add Option</button>
            </div>
          )}

          {activeType === 'trueFalse' && (
            <div className="flex items-center gap-6">
              <label className="block text-sm font-semibold text-slate-700">Correct Answer:</label>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input type="radio" checked={tfAnswer === true} onChange={() => setTfAnswer(true)} className="w-5 h-5 text-brand-600" /> True
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input type="radio" checked={tfAnswer === false} onChange={() => setTfAnswer(false)} className="w-5 h-5 text-brand-600" /> False
              </label>
            </div>
          )}

          {activeType === 'fillInBlanks' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Correct Answer</label>
                <input type="text" value={fibAnswer} onChange={(e) => setFibAnswer(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg" placeholder="Exact answer" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Alternative Accepted Answers (comma separated)</label>
                <input type="text" value={fibAlts} onChange={(e) => setFibAlts(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg" placeholder="e.g. colour, coloring" />
              </div>
            </div>
          )}

          {activeType === 'multiSelect' && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">Options (Check all correct answers)</label>
              {msOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input 
                    type="checkbox"
                    checked={msCorrectIndices.includes(idx)}
                    onChange={(e) => {
                      if (e.target.checked) setMsCorrectIndices([...msCorrectIndices, idx]);
                      else setMsCorrectIndices(msCorrectIndices.filter(i => i !== idx));
                    }}
                    className="w-5 h-5 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                  />
                  <input 
                    type="text" value={opt}
                    onChange={(e) => {
                      const newOpts = [...msOptions];
                      newOpts[idx] = e.target.value;
                      setMsOptions(newOpts);
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-brand-500"
                  />
                </div>
              ))}
              <button onClick={() => setMsOptions([...msOptions, ''])} className="text-sm font-semibold text-brand-600 hover:text-brand-700">+ Add Option</button>
            </div>
          )}

          {activeType === 'matchTheFollowing' && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">Matching Pairs (Side by side are correct matches)</label>
              {matchPairs.map((pair, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input 
                    type="text" value={pair.left} placeholder={`Left ${idx + 1}`}
                    onChange={(e) => { const np = [...matchPairs]; np[idx].left = e.target.value; setMatchPairs(np); }}
                    className="flex-1 p-2 border border-slate-200 rounded-lg"
                  />
                  <span className="text-slate-400">➡️</span>
                  <input 
                    type="text" value={pair.right} placeholder={`Right ${idx + 1}`}
                    onChange={(e) => { const np = [...matchPairs]; np[idx].right = e.target.value; setMatchPairs(np); }}
                    className="flex-1 p-2 border border-slate-200 rounded-lg"
                  />
                  <button onClick={() => setMatchPairs(matchPairs.filter((_, i) => i !== idx))} className="text-red-500 font-bold px-2">✕</button>
                </div>
              ))}
              <button onClick={() => setMatchPairs([...matchPairs, {left: '', right: ''}])} className="text-sm font-semibold text-brand-600 hover:text-brand-700">+ Add Pair</button>
            </div>
          )}

          {activeType === 'reordering' && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">Items in Correct Sequence</label>
              {reorderItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{idx + 1}</span>
                  <input 
                    type="text" value={item} placeholder={`Sequence item ${idx + 1}`}
                    onChange={(e) => { const ni = [...reorderItems]; ni[idx] = e.target.value; setReorderItems(ni); }}
                    className="flex-1 p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              ))}
              <button onClick={() => setReorderItems([...reorderItems, ''])} className="text-sm font-semibold text-brand-600 hover:text-brand-700">+ Add Item</button>
            </div>
          )}

          {activeType === 'sorting' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Categories</label>
                {sortCategories.map((cat, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input 
                      type="text" value={cat} placeholder={`Category ${idx + 1}`}
                      onChange={(e) => { const nc = [...sortCategories]; nc[idx] = e.target.value; setSortCategories(nc); }}
                      className="flex-1 p-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                ))}
                <button onClick={() => setSortCategories([...sortCategories, 'New Category'])} className="text-xs font-semibold text-brand-600">+ Add Category</button>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Items to Sort</label>
                {sortItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input 
                      type="text" value={item.text} placeholder={`Item text`}
                      onChange={(e) => { const ni = [...sortItems]; ni[idx].text = e.target.value; setSortItems(ni); }}
                      className="flex-1 p-2 border border-slate-200 rounded-lg"
                    />
                    <select 
                      value={item.category}
                      onChange={(e) => { const ni = [...sortItems]; ni[idx].category = e.target.value; setSortItems(ni); }}
                      className="p-2 border border-slate-200 rounded-lg bg-white"
                    >
                      {sortCategories.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  </div>
                ))}
                <button onClick={() => setSortItems([...sortItems, {text: '', category: sortCategories[0]}])} className="text-xs font-semibold text-brand-600">+ Add Sortable Item</button>
              </div>
            </div>
          )}

        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Explanation (Optional)</label>
          <textarea 
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
            rows={2}
            placeholder="Explain why the answer is correct..."
          />
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button onClick={resetForm} className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-semibold transition">
            Clear
          </button>
          <button onClick={handleAddQuestion} className="px-6 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-md shadow-brand-500/20 transition">
            Add Question
          </button>
        </div>
      </div>
      </div>

      {/* Right Column: Preview List */}
      <div className="w-full lg:w-96 flex flex-col space-y-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col h-full max-h-[80vh]">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-xl font-bold text-slate-900">Preview</h2>
            <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2 py-1 rounded-full">{generatedQuestions.length} Items</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {generatedQuestions.length === 0 ? (
              <div className="text-center text-slate-400 py-12">
                <span className="text-3xl block mb-2">📋</span>
                <p className="text-sm">No questions added yet.</p>
              </div>
            ) : (
              generatedQuestions.map((q, idx) => (
                <div key={idx} className="p-3 border border-slate-100 rounded-xl bg-slate-50 hover:border-brand-300 transition group relative">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">{q.type}</span>
                    <button onClick={() => handleRemoveQuestion(idx)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">✕</button>
                  </div>
                  <p className="text-sm text-slate-800 font-medium mt-2 line-clamp-2">{q.prompt}</p>
                  <div className="mt-2 text-xs text-slate-500 font-medium">Marks: {q.marks}</div>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 space-y-3">
            {exportError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-bold">
                ⚠️ {exportError}
              </div>
            )}
            <button 
              disabled={generatedQuestions.length === 0 || exporting}
              onClick={handleExport}
              className="w-full py-3 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-500 transition shadow-md shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                  Saving...
                </span>
              ) : `✅ Save & Export (${generatedQuestions.length} Questions)`}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
