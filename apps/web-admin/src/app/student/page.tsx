'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthContext';

export default function StudentDashboard() {
  const router = useRouter();
  const { user, session, loading, logout } = useAuth();

  // Assignment states
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  
  // Quiz taking states
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  // Review flags per question
  const [reviewFlags, setReviewFlags] = useState<Record<string, boolean>>({});
  // Currently focused question ID for navigation
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<any | null>(null);

  // Timer & Attempt States
  const [timerError, setTimerError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  
  // Dashboard Extra States
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);
  const [showUrgentWarning, setShowUrgentWarning] = useState<boolean>(false);

  useEffect(() => {
    if (!loading) {
      if (!session || !user) {
        router.replace('/login');
      } else if (user.role !== 'STUDENT') {
        router.replace('/access-denied');
      }
    }
  }, [user, session, loading, router]);

  // Set initial current question when assignment loads
  useEffect(() => {
    const ql = selectedAssignment?.questions || [];
    if (selectedAssignment && ql.length > 0 && !currentQuestionId) {
      setCurrentQuestionId(ql[0].question.id);
    }
  }, [selectedAssignment, currentQuestionId]);

  // Scroll to current question when changed
  useEffect(() => {
    if (currentQuestionId) {
      const el = document.getElementById(`question-${currentQuestionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentQuestionId]);

  // Fetch active assignments from the database
  useEffect(() => {
    if (session?.access_token && user?.role === 'STUDENT') {
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
            setAssignments(data);
          }
        })
        .catch((err) => console.error('Error fetching assignments:', err))
        .finally(() => setLoadingAssignments(false));
    }
  }, [session, user]);

  const getInitials = (name: string) => {
    return name
      ? name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'U';
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0'),
    ].join(':');
  };

  const getTimerStyles = (secs: number) => {
    if (secs > 600) {
      return 'text-emerald-700 bg-emerald-50 border-emerald-300';
    }
    if (secs > 300) {
      return 'text-amber-700 bg-amber-50 border-amber-300';
    }
    if (secs > 60) {
      return 'text-rose-700 bg-rose-50 border-rose-300';
    }
    return 'text-red-700 bg-red-50 border-red-400 animate-pulse font-black scale-105';
  };

  const handleStartAssignment = async (assignment: any) => {
    setTimerError(null);
    setIsLocked(false);
    
    try {
      const res = await fetch(`/api/assessments/${assignment.id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      
      const data = await res.json();
      
      if (!data.success) {
        setTimerError(data.message || 'Unable to start test.');
        return;
      }
      
      const attempt = data.attempt;

      let updatedAssignment = { ...assignment };
      if (attempt.questionOrder && Array.isArray(attempt.questionOrder)) {
        const orderMap = new Map(attempt.questionOrder.map((id: string, idx: number) => [id, idx]));
        const orderedQuestions = [...(assignment.questions || [])].sort((a: any, b: any) => {
          const idxA = orderMap.get(a.question.id);
          const idxB = orderMap.get(b.question.id);
          if (idxA !== undefined && idxB !== undefined) {
            return Number(idxA) - Number(idxB);
          }
          return 0;
        });
        updatedAssignment.questions = orderedQuestions;
      }
      
      if (attempt.submissionStatus === 'submitted' || attempt.submissionStatus === 'auto_submitted') {
        let correctCount = attempt.score || 0;
        let totalCount = updatedAssignment.questions?.length || 0;
        const questionsList = updatedAssignment.questions || [];
        
        const evaluatedQuestions = questionsList.map((item: any) => {
          const q = item.question;
          const studentAns = attempt.answers[q.id];
          const content = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;
          const correctVal = content.correctAnswer;
          
          let isCorrect = false;
          if (studentAns !== undefined && studentAns !== null) {
            if (q.type === 'multipleChoice') {
              isCorrect = String(studentAns).trim().toLowerCase() === String(correctVal).trim().toLowerCase();
            } else if (q.type === 'trueFalse') {
              const sBool = typeof studentAns === 'boolean' ? studentAns : (String(studentAns).trim().toLowerCase() === 'true');
              const cBool = typeof correctVal === 'boolean' ? correctVal : (String(correctVal).trim().toLowerCase() === 'true');
              isCorrect = sBool === cBool;
            } else if (q.type === 'fillInBlanks') {
              const primaryMatch = String(studentAns || '').trim().toLowerCase() === String(correctVal || '').trim().toLowerCase();
              const altMatches = Array.isArray(content.alternatives)
                ? content.alternatives.some((alt: string) => String(studentAns || '').trim().toLowerCase() === String(alt || '').trim().toLowerCase())
                : false;
              isCorrect = primaryMatch || altMatches;
            } else if (q.type === 'multiSelect') {
              if (Array.isArray(studentAns) && Array.isArray(correctVal)) {
                const sSet = new Set(studentAns.map(v => String(v).trim().toLowerCase()));
                const cSet = new Set(correctVal.map(v => String(v).trim().toLowerCase()));
                isCorrect = sSet.size === cSet.size && [...sSet].every(v => cSet.has(v));
              }
            } else {
              isCorrect = JSON.stringify(studentAns) === JSON.stringify(correctVal);
            }
          }
          
          return {
            question: q,
            studentAnswer: studentAns,
            correctAnswer: correctVal,
            explanation: content.explanation,
            isCorrect,
          };
        });
        
        setQuizResult({
          score: attempt.score !== null ? Math.round((attempt.score / (attempt.maxScore || totalCount)) * 100) : 0,
          correctCount: evaluatedQuestions.filter((q: any) => q.isCorrect).length,
          totalCount,
          questions: evaluatedQuestions,
          obtainedMarks: attempt.score !== null ? attempt.score : 0,
          maxMarks: attempt.maxScore || totalCount,
          negativeMarking: updatedAssignment.negativeMarking,
        });
        return;
      }
      
      setAnswers(attempt.answers || {});
      setSelectedAssignment(updatedAssignment);
      
      const now = new Date();
      const expiresAt = new Date(attempt.expiresAt);
      const secondsLeft = Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / 1000));
      setRemainingSeconds(secondsLeft);
      
      if (secondsLeft <= 0) {
        setIsLocked(true);
      }
    } catch (err: any) {
      console.error('Error starting assessment:', err);
      setTimerError('Connection error. Please try again.');
    }
  };

  const handleOptionSelect = (questionId: string, value: any, isMulti = false) => {
    if (isLocked) return;
    
    if (isMulti) {
      const current = answers[questionId] || [];
      if (current.includes(value)) {
        setAnswers({ ...answers, [questionId]: current.filter((v: any) => v !== value) });
      } else {
        setAnswers({ ...answers, [questionId]: [...current, value] });
      }
    } else {
      setAnswers({ ...answers, [questionId]: value });
    }
  };

  const handleSubmitQuiz = () => {
    if (!selectedAssignment || isLocked) return;

    const questionsList = selectedAssignment.questions || [];
    const totalCount = questionsList.length;

    fetch(`/api/assessments/${selectedAssignment.id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        answers: answers,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to submit assessment');
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          const attempt = data.attempt || {};
          
          const evaluatedQuestions = questionsList.map((item: any) => {
            const q = item.question;
            const studentAns = answers[q.id];
            const content = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;
            const correctVal = content.correctAnswer;
            
            let isCorrect = false;
            if (studentAns !== undefined && studentAns !== null) {
              if (q.type === 'multipleChoice') {
                isCorrect = String(studentAns).trim().toLowerCase() === String(correctVal).trim().toLowerCase();
              } else if (q.type === 'trueFalse') {
                const sBool = typeof studentAns === 'boolean' ? studentAns : (String(studentAns).trim().toLowerCase() === 'true');
                const cBool = typeof correctVal === 'boolean' ? correctVal : (String(correctVal).trim().toLowerCase() === 'true');
                isCorrect = sBool === cBool;
              } else if (q.type === 'fillInBlanks') {
                const primaryMatch = String(studentAns || '').trim().toLowerCase() === String(correctVal || '').trim().toLowerCase();
                const altMatches = Array.isArray(content.alternatives)
                  ? content.alternatives.some((alt: string) => String(studentAns || '').trim().toLowerCase() === String(alt || '').trim().toLowerCase())
                  : false;
                isCorrect = primaryMatch || altMatches;
              } else if (q.type === 'multiSelect') {
                if (Array.isArray(studentAns) && Array.isArray(correctVal)) {
                  const sSet = new Set(studentAns.map(v => String(v).trim().toLowerCase()));
                  const cSet = new Set(correctVal.map(v => String(v).trim().toLowerCase()));
                  isCorrect = sSet.size === cSet.size && [...sSet].every(v => cSet.has(v));
                }
              } else {
                isCorrect = JSON.stringify(studentAns) === JSON.stringify(correctVal);
              }
            }
            
            return {
              question: q,
              studentAnswer: studentAns,
              correctAnswer: correctVal,
              explanation: content.explanation,
              isCorrect,
            };
          });

          setQuizResult({
            score: attempt.score !== null ? Math.round((attempt.score / (attempt.maxScore || totalCount)) * 100) : 0,
            correctCount: evaluatedQuestions.filter((q: any) => q.isCorrect).length,
            totalCount,
            questions: evaluatedQuestions,
            obtainedMarks: attempt.score !== null ? attempt.score : 0,
            maxMarks: attempt.maxScore || totalCount,
            negativeMarking: selectedAssignment.negativeMarking,
          });
        }
      })
      .catch((err) => {
        console.error('Error submitting score:', err);
        alert('Failed to submit assessment. Please check your connection.');
      });
  };

  const handleAutoSubmit = () => {
    setIsLocked(true);
    if (!selectedAssignment) return;

    fetch(`/api/assessments/${selectedAssignment.id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        answers: answers,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to auto-submit');
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          const attempt = data.attempt || {};
          const questionsList = selectedAssignment.questions || [];
          const totalCount = questionsList.length;

          const evaluatedQuestions = questionsList.map((item: any) => {
            const q = item.question;
            const studentAns = answers[q.id];
            const content = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;
            const correctVal = content.correctAnswer;

            let isCorrect = false;
            if (studentAns !== undefined && studentAns !== null) {
              if (q.type === 'multipleChoice') {
                isCorrect = String(studentAns).trim().toLowerCase() === String(correctVal).trim().toLowerCase();
              } else if (q.type === 'trueFalse') {
                isCorrect = Boolean(studentAns) === Boolean(correctVal);
              } else if (q.type === 'fillInBlanks') {
                const primaryMatch = String(studentAns || '').trim().toLowerCase() === String(correctVal || '').trim().toLowerCase();
                const altMatches = Array.isArray(content.alternatives)
                  ? content.alternatives.some((alt: string) => String(studentAns || '').trim().toLowerCase() === String(alt || '').trim().toLowerCase())
                  : false;
                isCorrect = primaryMatch || altMatches;
              } else if (q.type === 'multiSelect') {
                if (Array.isArray(studentAns) && Array.isArray(correctVal)) {
                  const sSet = new Set(studentAns.map(v => String(v).trim().toLowerCase()));
                  const cSet = new Set(correctVal.map(v => String(v).trim().toLowerCase()));
                  isCorrect = sSet.size === cSet.size && [...sSet].every(v => cSet.has(v));
                }
              } else {
                isCorrect = JSON.stringify(studentAns) === JSON.stringify(correctVal);
              }
            }

            return {
              question: q,
              studentAnswer: studentAns,
              correctAnswer: correctVal,
              explanation: content.explanation,
              isCorrect,
            };
          });

          setQuizResult({
            score: attempt.score !== null ? Math.round((attempt.score / (attempt.maxScore || totalCount)) * 100) : 0,
            correctCount: evaluatedQuestions.filter((q: any) => q.isCorrect).length,
            totalCount,
            questions: evaluatedQuestions,
            obtainedMarks: attempt.score !== null ? attempt.score : 0,
            maxMarks: attempt.maxScore || totalCount,
          });
        }
      })
      .catch((err) => {
        console.error('Error auto-submitting:', err);
        setSelectedAssignment(null);
      });
  };

  const saveProgress = async () => {
    if (!selectedAssignment || isLocked) return;
    try {
      const res = await fetch(`/api/assessments/${selectedAssignment.id}/save-answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (data.success) {
        setLastSavedAt(new Date());
        if (data.autoSubmitted) {
          setIsLocked(true);
          handleAutoSubmit();
        }
      }
    } catch (err) {
      console.error('Error saving answers:', err);
    }
  };

  const handleNext = () => {
    saveProgress();
    if (!selectedAssignment || !currentQuestionId) return;
    const qList = selectedAssignment.questions || [];
    const idx = qList.findIndex((q: any) => q.question.id === currentQuestionId);
    if (idx >= 0 && idx < qList.length - 1) {
      setCurrentQuestionId(qList[idx + 1].question.id);
    }
  };

  const handlePrev = () => {
    saveProgress();
    if (!selectedAssignment || !currentQuestionId) return;
    const qList = selectedAssignment.questions || [];
    const idx = qList.findIndex((q: any) => q.question.id === currentQuestionId);
    if (idx > 0) {
      setCurrentQuestionId(qList[idx - 1].question.id);
    }
  };

  const handleClearResponse = () => {
    if (!currentQuestionId || isLocked) return;
    const newAnswers = { ...answers };
    delete newAnswers[currentQuestionId];
    setAnswers(newAnswers);
  };

  // Countdown ticker effect
  useEffect(() => {
    if (!selectedAssignment || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === 600) {
          // 10 minutes warning (can trigger a toast here if we had one)
        }
        if (prev === 300 && !showUrgentWarning) {
          setShowUrgentWarning(true);
        }
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedAssignment, remainingSeconds, showUrgentWarning]);

  // Autosave answers effect
  useEffect(() => {
    if (!selectedAssignment || isLocked || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      saveProgress();
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedAssignment, answers, isLocked, remainingSeconds]);

  if (loading || !user || user.role !== 'STUDENT') {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-center items-center font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
        <p className="mt-4 text-xs text-slate-600 font-medium">Verifying student credentials...</p>
      </div>
    );
  }

  // QUIZ RESULT VIEW
  if (quizResult) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <span className="font-black text-slate-900 text-lg">
              QP <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-400">Result Console</span>
            </span>
            <button
              onClick={() => {
                setQuizResult(null);
                setSelectedAssignment(null);
              }}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition"
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-8 text-left">
          <div className="border border-slate-200 bg-white rounded-3xl p-8 text-center space-y-4 shadow-sm backdrop-blur-md">
            <div className="mx-auto w-24 h-24 rounded-full flex items-center justify-center border-4 border-brand-500 text-2xl font-black text-brand-700 bg-brand-50">
              {quizResult.score}%
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Assessment Completed!</h2>
            <p className="text-sm text-slate-600">
              You answered <strong className="text-emerald-600">{quizResult.correctCount}</strong> out of <strong className="text-slate-900">{quizResult.totalCount}</strong> questions correctly.
            </p>
            {quizResult.obtainedMarks !== undefined && (
              <p className="text-xs text-slate-500 mt-2">
                Total Score: <strong className="text-brand-600">{quizResult.obtainedMarks}</strong> / <strong className="text-slate-500">{quizResult.maxMarks}</strong> Marks
              </p>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-bold text-brand-600">Review Questions</h3>
            {quizResult.questions.map((item: any, index: number) => {
              const content = typeof item.question.content === 'string' ? JSON.parse(item.question.content) : item.question.content;
              return (
                <div key={item.question.id} className="border border-slate-200 bg-white shadow-sm rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">
                        Question {index + 1}
                      </span>
                      <span className="text-xs font-bold text-brand-600 bg-brand-50 border border-brand-200 px-3 py-1 rounded-full">
                        [{content.marks || 0} Marks]
                      </span>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${item.isCorrect ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>
                      {item.isCorrect 
                        ? '✓ Correct' 
                        : `✗ Incorrect${quizResult.negativeMarking ? ` (-${quizResult.negativeMarking} Marks)` : ''}`}
                    </span>
                  </div>
                  
                  <p className="text-slate-900 font-medium">{content.question?.text}</p>

                  <div className="text-sm space-y-2 pt-2 border-t border-slate-200">
                    <p className="text-slate-600">
                      Your Answer: <strong className={item.isCorrect ? 'text-emerald-600' : 'text-rose-600'}>
                        {Array.isArray(item.studentAnswer) 
                          ? item.studentAnswer.join(', ') 
                          : (item.studentAnswer !== undefined && item.studentAnswer !== null && item.studentAnswer !== '' 
                              ? String(item.studentAnswer) 
                              : 'None')}
                      </strong>
                    </p>
                    <p className="text-slate-600">
                      Correct Answer: <strong className="text-emerald-600">
                        {Array.isArray(item.correctAnswer) ? item.correctAnswer.join(', ') : String(item.correctAnswer)}
                      </strong>
                    </p>
                    {item.explanation && (
                      <div className="mt-2 p-3 rounded-lg bg-slate-50 text-xs text-slate-600 italic">
                        💡 {item.explanation}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  if (selectedAssignment) {
    const questionsList = selectedAssignment.questions || [];
    // Calculate stats
    const totalQuestions = questionsList.length;
    const attended = questionsList.filter(q => answers[q.question.id] !== undefined && answers[q.question.id] !== null && answers[q.question.id] !== '').length;
    const notAttended = totalQuestions - attended;
    const markedForReview = Object.values(reviewFlags).filter(v => v).length;
    const progressPercent = totalQuestions > 0 ? Math.round((attended / totalQuestions) * 100) : 0;
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans lg:flex-row">
        {/* Left Progress Panel */}
        <aside className="lg:sticky lg:top-4 lg:self-start w-full lg:w-64 bg-white/80 backdrop-blur-md border-r border-slate-200 p-4 lg:h-[calc(100vh-2rem)] flex flex-col">
          <h2 className="text-sm font-bold text-brand-600 mb-2">Exam Progress</h2>
          <ul className="space-y-2 text-xs">
            <li>📊 Total Questions: <span className="font-medium">{totalQuestions}</span></li>
            <li>✅ Attended: <span className="font-medium">{attended}</span></li>
            <li>❌ Not Attended: <span className="font-medium">{notAttended}</span></li>
            <li>⚠️ Marked For Review: <span className="font-medium">{markedForReview}</span></li>
            <li>⏱ Remaining Time: <span className="font-medium">{formatTime(remainingSeconds)}</span></li>
            <li>📈 Progress: <span className="font-medium">{progressPercent}% Completed</span></li>
          </ul>
          
          <div className="mt-4 flex-1 overflow-y-auto">
            <h3 className="text-xs font-semibold text-brand-600 mb-1">Question Navigation</h3>
            <div className="grid grid-cols-5 gap-1">
              {questionsList.map((item, idx) => {
                const qId = item.question.id;
                const answered = answers[qId] !== undefined && answers[qId] !== null && answers[qId] !== '';
                const isCurrent = currentQuestionId === qId;
                const isReview = reviewFlags[qId] || false;
                
                let bg = 'bg-rose-500 text-white border-rose-600'; // Default: Not Answered
                if (isCurrent) bg = 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-300';
                else if (isReview) bg = 'bg-amber-400 text-white border-amber-500';
                else if (answered) bg = 'bg-emerald-500 text-white border-emerald-600';

                return (
                  <button
                    key={qId}
                    onClick={() => {
                      saveProgress();
                      setCurrentQuestionId(qId);
                    }}
                    className={`h-8 w-8 flex items-center justify-center rounded-md text-xs font-medium border transition-transform hover:scale-105 ${bg}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span>💾</span> Last Saved: {lastSavedAt ? lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not saved yet'}
            </p>
          </div>
        </aside>
        {/* Main Quiz Content */}
        <div className="flex-1 p-4 lg:p-6 relative">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 py-3 flex items-center justify-between mb-4 rounded-xl">
            <div className="text-left truncate flex items-center gap-4">
              <div>
                <span className="text-xs font-bold text-brand-600 uppercase tracking-widest block">Attempting Assignment</span>
                <h1 className="font-extrabold text-slate-900 text-base truncate max-w-[150px] sm:max-w-md">{selectedAssignment.title}</h1>
              </div>
              <div className="hidden md:flex items-center gap-3 border-l border-slate-300 pl-4">
                <span className="text-xs font-semibold text-slate-600">Question {questionsList.findIndex((q:any) => q.question.id === currentQuestionId) + 1} of {totalQuestions}</span>
                <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-1 rounded-md">{progressPercent}% Completed</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold font-mono transition-all duration-300 ${getTimerStyles(remainingSeconds)}`}>
                <span>⏱️</span>
                <span>{formatTime(remainingSeconds)}</span>
              </div>
              <button
                onClick={() => {
                  if (confirm("Warning: Leaving this page does NOT pause the timer. The clock will continue to count down on the server. Are you sure you want to go back?")) {
                    setSelectedAssignment(null);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          </header>

          {isLocked && (
            <div className="m-4 p-4 rounded-xl bg-red-50 border border-red-300 text-red-700 font-bold text-sm text-center">
              ⏰ Time&apos;s up! Your assessment has been auto-submitted.
            </div>
          )}

          <main className="max-w-3xl mx-auto py-2 flex flex-col min-h-[60vh] justify-between">
            <div className="space-y-8 flex-1">
              {questionsList.filter((q:any) => q.question.id === currentQuestionId).map((item: any, idx: number) => {
                const q = item.question;
                const content = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;
                const studentAns = answers[q.id];
                const isReview = reviewFlags[q.id] || false;
                const actualIndex = questionsList.findIndex((ql:any) => ql.question.id === q.id);
                
                return (
                  <div
                    id={`question-${q.id}`}
                    key={q.id}
                    className="border border-brand-200 bg-white rounded-2xl p-8 space-y-6 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="bg-brand-50 text-brand-700 border border-brand-200 px-4 py-1.5 rounded-full text-sm font-bold">Question {actualIndex + 1}</span>
                        <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full capitalize">{q.type}</span>
                        <span className="text-xs font-bold text-brand-600 bg-brand-50 border border-brand-100 px-3 py-1 rounded-full">
                          [{content.marks || 1} Mark{(content.marks || 1) > 1 ? 's' : ''}]
                        </span>
                      </div>
                    </div>

                    <h2 className="text-xl text-slate-900 font-bold leading-relaxed">{content.question?.text || content.text}</h2>

                    {/* MULTIPLE CHOICE */}
                    {q.type === 'multipleChoice' && (
                      <div className="grid grid-cols-1 gap-3 pt-4">
                        {content.options?.map((opt: any, oIdx: number) => {
                          const isSelected = studentAns === opt.text;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              disabled={isLocked}
                              onClick={() => handleOptionSelect(q.id, opt.text)}
                              className={`w-full p-4 rounded-xl text-left text-base font-medium border transition-all flex items-center gap-4 disabled:opacity-60 disabled:cursor-not-allowed ${isSelected ? 'bg-brand-50 border-brand-500 text-brand-800 shadow-sm' : 'bg-white border-slate-200 hover:border-brand-300 text-slate-700 hover:bg-slate-50'}`}
                            >
                              <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-brand-600 bg-brand-600' : 'border-slate-300'}`}>
                                {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                              </div>
                              <span><strong className="mr-2 opacity-60">{String.fromCharCode(65 + oIdx)}.</strong>{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* TRUE / FALSE */}
                    {q.type === 'trueFalse' && (
                      <div className="grid grid-cols-2 gap-4 pt-4">
                        {[true, false].map((val) => {
                          const isSelected = studentAns === val || studentAns === String(val);
                          return (
                            <button
                              key={String(val)}
                              type="button"
                              disabled={isLocked}
                              onClick={() => handleOptionSelect(q.id, val)}
                              className={`p-5 rounded-xl text-center text-lg font-bold border transition-all disabled:opacity-60 disabled:cursor-not-allowed ${isSelected ? 'bg-brand-50 border-brand-500 text-brand-800 shadow-sm' : 'bg-white border-slate-200 hover:border-brand-300 text-slate-700 hover:bg-slate-50'}`}
                            >
                              {val ? 'True' : 'False'}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* MULTI SELECT */}
                    {q.type === 'multiSelect' && (
                      <div className="grid grid-cols-1 gap-3 pt-4">
                        {content.options?.map((opt: any, oIdx: number) => {
                          const isSelected = Array.isArray(studentAns) && studentAns.includes(opt.text);
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              disabled={isLocked}
                              onClick={() => handleOptionSelect(q.id, opt.text, true)}
                              className={`w-full p-4 rounded-xl text-left text-base font-medium border transition-all flex items-center gap-4 disabled:opacity-60 disabled:cursor-not-allowed ${isSelected ? 'bg-brand-50 border-brand-500 text-brand-800 shadow-sm' : 'bg-white border-slate-200 hover:border-brand-300 text-slate-700 hover:bg-slate-50'}`}
                            >
                              <div className={`h-6 w-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-brand-600 bg-brand-600' : 'border-slate-300'}`}>
                                {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                              </div>
                              {opt.text}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* FILL IN THE BLANKS & OTHER TYPES */}
                    {q.type !== 'multipleChoice' && q.type !== 'trueFalse' && q.type !== 'multiSelect' && (
                      <div className="space-y-3 pt-4">
                        <label className="text-sm text-slate-700 font-bold block">Type Your Answer Below</label>
                        <input
                          type="text"
                          disabled={isLocked}
                          value={studentAns || ''}
                          onChange={(e) => handleOptionSelect(q.id, e.target.value)}
                          placeholder="Type exact answer here..."
                          className="w-full bg-white border-2 border-slate-200 rounded-xl px-5 py-4 text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                        {q.type === 'matchTheFollowing' && (
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 space-y-2 mt-4">
                            <span className="font-bold text-slate-900 block border-b border-slate-200 pb-2">Items to Match:</span>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                              <div><strong className="text-xs text-slate-500 uppercase">Left Column</strong><ul className="list-disc pl-4 mt-1">{content.leftItems?.map((i:string,idx:number)=><li key={idx}>{i}</li>)}</ul></div>
                              <div><strong className="text-xs text-slate-500 uppercase">Right Column</strong><ul className="list-disc pl-4 mt-1">{content.rightItems?.map((i:string,idx:number)=><li key={idx}>{i}</li>)}</ul></div>
                            </div>
                            <span className="italic block mt-2 text-xs text-brand-600">Note: Enter matches in the form "A - B" separated by commas.</span>
                          </div>
                        )}
                        {q.type === 'reordering' && (
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 mt-4">
                            <span className="font-bold text-slate-900 block mb-2">Items to Order:</span>
                            <ul className="list-decimal pl-4">{content.items?.map((i:string,idx:number)=><li key={idx}>{i}</li>)}</ul>
                          </div>
                        )}
                        {q.type === 'sorting' && (
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 space-y-2 mt-4">
                            <span className="font-bold text-slate-900 block">Categories:</span>
                            <p>{content.categories?.join(', ')}</p>
                            <span className="font-bold text-slate-900 block mt-2">Items to Sort:</span>
                            <p>{content.items?.join(', ')}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Navigation Buttons Bottom */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-2">
                <button
                  onClick={handlePrev}
                  disabled={isLocked}
                  className="px-5 py-2.5 rounded-xl font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  ← Previous
                </button>
                <button
                  onClick={handleNext}
                  disabled={isLocked}
                  className="px-5 py-2.5 rounded-xl font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Next →
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                     if(currentQuestionId){
                       setReviewFlags(prev => ({...prev, [currentQuestionId]: !prev[currentQuestionId]}));
                     }
                  }}
                  disabled={isLocked}
                  className="px-4 py-2.5 rounded-xl font-bold border transition-all text-amber-700 bg-amber-50 border-amber-300 hover:bg-amber-100 disabled:opacity-50"
                >
                  ⚠️ Mark for Review
                </button>
                <button
                  onClick={handleClearResponse}
                  disabled={isLocked}
                  className="px-4 py-2.5 rounded-xl font-bold border transition-all text-slate-600 bg-white border-slate-300 hover:bg-slate-100 disabled:opacity-50"
                >
                  ✕ Clear Response
                </button>
                <button
                  onClick={handleNext}
                  disabled={isLocked}
                  className="px-6 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  Save & Next
                </button>
              </div>
            </div>

            <div className="mt-12 flex justify-end">
              <button
                onClick={() => setShowSubmitConfirm(true)}
                disabled={isLocked}
                className="px-8 py-3 rounded-xl font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/30 transition-all disabled:opacity-50"
              >
                Submit Assessment
              </button>
            </div>
          </main>
          
          {/* Submit Confirmation Modal */}
          {showSubmitConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
                <div className="bg-brand-600 p-6 text-white text-center">
                  <span className="text-4xl block mb-2">📋</span>
                  <h3 className="text-xl font-bold">Submit Assessment?</h3>
                  <p className="text-brand-100 text-sm mt-1">Review your progress before final submission</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                      <span className="block text-2xl font-black text-slate-800">{totalQuestions}</span>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</span>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
                      <span className="block text-2xl font-black text-emerald-600">{attended}</span>
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Answered</span>
                    </div>
                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 text-center">
                      <span className="block text-2xl font-black text-rose-600">{notAttended}</span>
                      <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Unanswered</span>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-center">
                      <span className="block text-2xl font-black text-amber-600">{markedForReview}</span>
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">For Review</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm text-center font-medium">
                    ⏱️ Time Remaining: {formatTime(remainingSeconds)}
                  </div>
                  
                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button 
                      onClick={() => setShowSubmitConfirm(false)}
                      className="flex-1 py-3 px-4 rounded-xl font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Return to Test
                    </button>
                    <button 
                      onClick={() => {
                        setShowSubmitConfirm(false);
                        handleSubmitQuiz();
                      }}
                      className="flex-1 py-3 px-4 rounded-xl font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/30 transition-colors"
                    >
                      Confirm Submit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // DEFAULT DASHBOARD VIEW
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div onClick={() => router.push('/')} className="flex items-center gap-3 cursor-pointer group">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center font-extrabold text-white text-lg shadow-lg transition-transform group-hover:scale-105 bg-gradient-to-tr from-brand-600 via-brand-500 to-brand-400 shadow-brand-500/30">
              QP
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 text-base tracking-tight leading-none">
                  Question <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-400">Papers</span>
                </span>
                <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded border text-brand-600 border-brand-200 bg-brand-50">
                  Student Hub
                </span>
              </div>
              <span className="text-[9px] font-medium text-slate-500 tracking-wide mt-0.5">Generator System</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">


            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="h-8 w-8 rounded-full border flex items-center justify-center text-xs font-bold bg-brand-50 border-brand-200 text-brand-600">
                {getInitials(user.name || '')}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-900">{user.name}</span>
                <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                  {user.email}
                </span>
              </div>
              <button
                onClick={logout}
                className="ml-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-red-200 hover:bg-red-50 text-xs font-semibold text-slate-500 hover:text-red-600 transition"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main View */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 md:px-8 space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-brand-50 via-white to-slate-50 p-8 md:p-12 shadow-sm">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 h-80 w-80 rounded-full bg-brand-600/5 blur-3xl" />
          <div className="relative z-10 space-y-4 max-w-2xl text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-200">
              🎓 Student Dashboard
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 text-left animate-in fade-in duration-700">
              Active Assessments
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed text-left">
              Complete the tests and homework uploaded and configured by your official course instructors.
            </p>
          </div>
        </div>

        {timerError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{timerError}</span>
            </span>
            <button 
              onClick={() => setTimerError(null)} 
              className="text-xs font-bold text-red-600 hover:text-red-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Dynamic Assignment List */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-brand-600 flex items-center gap-2 text-left">
            <span>📅</span> Active Assignments ({assignments.length})
          </h2>

          {loadingAssignments ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-brand-500"></div>
              <p className="text-xs text-slate-500">Loading assignments...</p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="border border-slate-200 rounded-2xl bg-white shadow-sm p-12 text-center space-y-2">
              <span className="text-3xl block">📭</span>
              <h3 className="font-bold text-slate-900">No Assignments Uploaded</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your teachers have not uploaded or approved any assessment sets yet. Check back later!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {assignments.map((assignment) => {
                const totalQuestions = assignment.questions?.length || 0;
                const minutes = assignment.timeLimitSeconds ? Math.round(assignment.timeLimitSeconds / 60) : 30;

                return (
                  <div
                    key={assignment.id}
                    className="border border-slate-200 rounded-2xl bg-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm hover:border-brand-300 hover:shadow-md transition-all"
                  >
                    <div className="text-left space-y-2 flex-1">
                      <div className="flex flex-wrap gap-2 items-center">
                        <h3 className="text-lg font-bold text-slate-900">{assignment.title}</h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-50 border border-brand-200 text-brand-700">
                          {assignment.status}
                        </span>
                      </div>
                      
                      {assignment.description && (
                        <p className="text-sm text-slate-500">{assignment.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          👤 Instructor: <strong className="text-brand-600">{assignment.createdBy?.name || 'Teacher'}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          ⏱️ Time Limit: <strong className="text-slate-700">{minutes} mins</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          📋 Questions: <strong className="text-slate-700">{totalQuestions} questions</strong>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartAssignment(assignment)}
                      className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs whitespace-nowrap shadow-md shadow-brand-500/20 transition-all"
                    >
                      Start Assessment ➡️
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
