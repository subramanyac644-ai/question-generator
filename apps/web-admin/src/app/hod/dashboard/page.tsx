'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';

interface Question {
  id: string;
  type: string;
  difficulty: string;
  prompt: string;
  content: any;
}

interface QuestionSetQuestion {
  questionSetId: string;
  questionId: string;
  order: number;
  question: Question;
}

interface UserSummary {
  name: string | null;
  email: string;
}

interface QuestionSet {
  id: string;
  title: string;
  description: string | null;
  timeLimitSeconds: number;
  testDuration: number;
  status: string;
  departmentId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  hodComment: string | null;
  negativeMarking: number;
  randomizeOrder: boolean;
  createdBy: UserSummary;
  questions: QuestionSetQuestion[];
}

interface Attempt {
  id: string;
  userId: string;
  questionSetId: string;
  score: number | null;
  maxScore: number | null;
  startedAt: string;
  submittedAt: string | null;
  submissionStatus: string;
  user: UserSummary;
}

interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function HODDashboard() {
  const router = useRouter();
  const { user, session, loading, logout } = useAuth();
  
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [selectedSet, setSelectedSet] = useState<QuestionSet | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending_approval' | 'approved' | 'rejected' | 'regeneration_requested'>('all');
  const [detailTab, setDetailTab] = useState<'questions' | 'results'>('questions');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [actionType, setActionType] = useState<'reject' | 'regenerate' | null>(null);
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);
  const [selectedQuestionType, setSelectedQuestionType] = useState<string>('all');

  useEffect(() => {
    if (!loading) {
      if (!session || !user) {
        router.replace('/login');
      } else if (user.role !== 'HOD') {
        router.replace('/access-denied');
      }
    }
  }, [user, session, loading, router]);

  useEffect(() => {
    if (session?.access_token && user?.role === 'HOD') {
      loadDashboardData();
    }
  }, [session, user]);

  const loadDashboardData = async () => {
    setLoadingData(true);
    await Promise.all([fetchQuestionSets(), fetchNotifications()]);
    setLoadingData(false);
  };

  const fetchQuestionSets = async () => {
    try {
      const res = await fetch('/api/hod/question-sets', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setQuestionSets(data);
      }
    } catch (err) {
      console.error('Failed to fetch question sets:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const fetchAttempts = async (setId: string) => {
    setLoadingAttempts(true);
    try {
      const res = await fetch(`/api/question-sets/${setId}/attempts`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAttempts(data);
      }
    } catch (err) {
      console.error('Failed to fetch attempts:', err);
    } finally {
      setLoadingAttempts(false);
    }
  };

  const markNotificationsAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const handleOpenSet = (set: QuestionSet) => {
    setSelectedSet(set);
    setDetailTab('questions');
    setSelectedQuestionType('all');
    setReviewComment('');
    setActionType(null);
    fetchAttempts(set.id);
  };

  const handleApprove = async (setId: string) => {
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/question-sets/${setId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        await loadDashboardData();
        setSelectedSet(null);
      } else {
        alert('Failed to approve question set.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReviewSubmit = async (setId: string, endpoint: 'reject' | 'regenerate-request') => {
    if (!reviewComment.trim()) {
      alert('Please provide comments/explanation for this review action.');
      return;
    }
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/question-sets/${setId}/${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: reviewComment }),
      });
      if (res.ok) {
        await loadDashboardData();
        setSelectedSet(null);
      } else {
        alert('Failed to update question set status.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20">Pending Approval</span>;
      case 'approved':
        return <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-red-500/15 text-red-400 border border-red-500/20">Rejected</span>;
      case 'regeneration_requested':
        return <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">Regeneration Requested</span>;
      default:
        return <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-slate-500/15 text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  const filteredSets = questionSets.filter(set => {
    if (activeFilter === 'all') return true;
    return set.status === activeFilter;
  });

  const getUniqueQuestionTypes = (questions: QuestionSetQuestion[]) => {
    const types = new Set<string>();
    questions.forEach(q => {
      if (q.question?.type) types.add(q.question.type);
    });
    return Array.from(types);
  };

  const renderQuestionDetail = (q: Question) => {
    const content = q.content || {};
    const questionText = content.question?.text || q.prompt;

    switch (q.type) {
      case 'multipleChoice':
      case 'multiSelect':
        return (
          <div className="space-y-3 mt-2 text-slate-700">
            <p className="font-semibold text-slate-900 text-sm">{questionText}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {(content.options || []).map((opt: any, idx: number) => {
                const isCorrect = Array.isArray(content.correctAnswer)
                  ? content.correctAnswer.includes(opt.text)
                  : content.correctAnswer === opt.text;
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border text-xs flex justify-between items-center ${
                      isCorrect
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{opt.text}</span>
                    {isCorrect && <span className="text-emerald-600 font-bold">✓ Correct</span>}
                  </div>
                );
              })}
            </div>
            {content.explanation && (
              <p className="text-xs text-slate-600 italic mt-1.5 bg-slate-50 p-2 rounded border border-slate-200">
                <span className="font-bold text-slate-700 not-italic">Explanation:</span> {content.explanation}
              </p>
            )}
          </div>
        );

      case 'trueFalse':
        return (
          <div className="space-y-3 mt-2 text-slate-700">
            <p className="font-semibold text-slate-900 text-sm">{questionText}</p>
            <div className="flex gap-4 mt-2">
              <div
                className={`flex-1 p-2 rounded-lg border text-center text-xs font-bold ${
                  content.correctAnswer === true
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                True {content.correctAnswer === true && '✓'}
              </div>
              <div
                className={`flex-1 p-2 rounded-lg border text-center text-xs font-bold ${
                  content.correctAnswer === false
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                False {content.correctAnswer === false && '✓'}
              </div>
            </div>
            {content.explanation && (
              <p className="text-xs text-slate-600 italic mt-1.5 bg-slate-50 p-2 rounded border border-slate-200">
                <span className="font-bold text-slate-700 not-italic">Explanation:</span> {content.explanation}
              </p>
            )}
          </div>
        );

      case 'fillInBlanks':
        return (
          <div className="space-y-2 mt-2 text-slate-700">
            <p className="font-semibold text-slate-900 text-sm">{questionText}</p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <p><span className="text-slate-600 font-bold">Answer: </span><span className="text-emerald-600 font-bold">{content.correctAnswer}</span></p>
              {content.alternatives && content.alternatives.length > 0 && (
                <p><span className="text-slate-600 font-bold">Accepted Alternatives: </span>{content.alternatives.join(', ')}</p>
              )}
            </div>
            {content.explanation && (
              <p className="text-xs text-slate-600 italic mt-1.5 bg-slate-50 p-2 rounded border border-slate-200">
                <span className="font-bold text-slate-700 not-italic">Explanation:</span> {content.explanation}
              </p>
            )}
          </div>
        );

      case 'matchTheFollowing':
        return (
          <div className="space-y-2 mt-2 text-slate-700">
            <p className="font-semibold text-slate-900 text-sm">{questionText}</p>
            <div className="mt-2 space-y-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
              <p className="font-bold text-slate-600 border-b border-slate-200 pb-1.5 mb-2">Matching Pairs</p>
              {(content.correctAnswer || []).map((pair: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center py-1">
                  <span className="text-slate-700">{pair.left}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-emerald-600 font-semibold">{pair.right}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'reordering':
        return (
          <div className="space-y-2 mt-2 text-slate-700">
            <p className="font-semibold text-slate-900 text-sm">{questionText}</p>
            <div className="mt-2 space-y-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
              <p className="font-bold text-slate-600 border-b border-slate-200 pb-1.5 mb-2">Correct Order</p>
              {(content.correctAnswer || []).map((item: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2 py-1">
                  <span className="h-5 w-5 bg-brand-50 text-brand-600 border border-brand-200 rounded-full flex items-center justify-center font-bold text-[10px]">{idx + 1}</span>
                  <span className="text-slate-700 font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'sorting':
        return (
          <div className="space-y-2 mt-2 text-slate-700">
            <p className="font-semibold text-slate-900 text-sm">{questionText}</p>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
              {Object.keys(content.correctAnswer || {}).map((category) => (
                <div key={category} className="space-y-1.5">
                  <p className="font-bold text-brand-600 uppercase tracking-wider text-[10px]">{category}</p>
                  <div className="space-y-1">
                    {(content.correctAnswer[category] || []).map((item: string, idx: number) => (
                      <div key={idx} className="p-1.5 bg-white border border-slate-200 rounded text-slate-700">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return <p className="text-xs text-slate-500 mt-2">Custom question details: {JSON.stringify(content)}</p>;
    }
  };

  if (loading || !user || user.role !== 'HOD') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
        <p className="mt-4 text-xs text-slate-600 font-medium">Verifying HOD credentials...</p>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-brand-500/10 bg-white/80 backdrop-blur-md px-6 py-4 transition-all">
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
                  HOD Dashboard
                </span>
              </div>
              <span className="text-[9px] font-medium text-slate-500 tracking-wide mt-0.5">Generator System</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications && unreadCount > 0) {
                    markNotificationsAsRead();
                  }
                }}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition relative"
              >
                <span>🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 h-4 w-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-black animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm z-50 text-left space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-900">System Notifications</span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-[11px] text-slate-500 text-center py-4">No notifications yet.</p>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif.id}
                          className={`p-2.5 rounded-lg border text-[11px] leading-relaxed transition ${
                            notif.read ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-brand-50 border-brand-200 text-brand-700'
                          }`}
                        >
                          <p>{notif.message}</p>
                          <span className="text-[9px] text-slate-500 block mt-1">
                            {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="h-8 w-8 rounded-full border flex items-center justify-center text-xs font-bold bg-brand-50 border-brand-200 text-brand-600">
                {getInitials(user.name || 'HOD')}
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 md:px-8 space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-r from-brand-50 via-white to-slate-50 p-8 md:p-12 shadow-sm">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 h-80 w-80 rounded-full bg-brand-600/5 blur-3xl" />
          <div className="relative z-10 space-y-4 max-w-2xl text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-200">
              💼 HOD Dashboard Active
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 text-left">
              Department Workflow Oversight
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed text-left">
              Welcome, {user.name || 'HOD'}! Review and audit all assignment tests generated by your department faculty. View questions, see student attempt marks, and manage the quality approval workflow.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="border border-slate-200 rounded-2xl bg-white shadow-sm p-5 space-y-2">
            <span className="text-xs text-slate-500 block uppercase font-bold text-left">Pending Approvals</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-500">
                {questionSets.filter(q => q.status === 'pending_approval').length}
              </span>
              <span className="text-xs text-slate-500 font-semibold">awaiting audit</span>
            </div>
          </div>
          <div className="border border-slate-200 rounded-2xl bg-white shadow-sm p-5 space-y-2">
            <span className="text-xs text-slate-500 block uppercase font-bold text-left">Approved Tests</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-500">
                {questionSets.filter(q => q.status === 'approved').length}
              </span>
              <span className="text-xs text-slate-500 font-semibold">visible to students</span>
            </div>
          </div>
          <div className="border border-slate-200 rounded-2xl bg-white shadow-sm p-5 space-y-2">
            <span className="text-xs text-slate-500 block uppercase font-bold text-left">Rejected Sets</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-red-500">
                {questionSets.filter(q => q.status === 'rejected').length}
              </span>
              <span className="text-xs text-slate-500 font-semibold">sent back to faculty</span>
            </div>
          </div>
          <div className="border border-slate-200 rounded-2xl bg-white shadow-sm p-5 space-y-2">
            <span className="text-xs text-slate-500 block uppercase font-bold text-left">Total Assignments</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{questionSets.length}</span>
              <span className="text-xs text-slate-500 font-semibold">total generated</span>
            </div>
          </div>
        </div>

        {/* Filter Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
          {[
            { id: 'all', label: 'All Question Sets' },
            { id: 'pending_approval', label: 'Pending Approval' },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'regeneration_requested', label: 'Regeneration Requested' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeFilter === tab.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Question Sets List */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-brand-600 flex items-center gap-2">
            <span>📝</span> Assignment Tests list
          </h2>
          <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="px-5 py-4">Title</th>
                    <th className="px-5 py-4">Created By</th>
                    <th className="px-5 py-4">Questions</th>
                    <th className="px-5 py-4">Duration</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
                  {loadingData ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-brand-500 mx-auto"></div>
                        <p className="mt-2 text-xs">Loading assignments data...</p>
                      </td>
                    </tr>
                  ) : filteredSets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                        No question sets found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredSets.map((set) => (
                      <tr key={set.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 font-semibold text-slate-900">{set.title}</td>
                        <td className="px-5 py-4 text-slate-600">
                          <span className="block font-medium text-slate-900">{set.createdBy?.name || 'Faculty Member'}</span>
                          <span className="text-[10px] text-slate-500">{set.createdBy?.email}</span>
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-700">
                          {set.questions?.length || 0} Questions
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {set.testDuration} mins
                        </td>
                        <td className="px-5 py-4">
                          {getStatusBadge(set.status)}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => handleOpenSet(set)}
                            className="bg-brand-50 hover:bg-brand-100 text-brand-600 border border-brand-200 rounded-lg px-3 py-1.5 font-bold transition"
                          >
                            Open Review
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detailed Modal/Drawer Review */}
        {selectedSet && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative text-left">
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">{selectedSet.title}</h3>
                    {getStatusBadge(selectedSet.status)}
                  </div>
                  <p className="text-xs text-slate-500">
                    Created by {selectedSet.createdBy?.name} ({selectedSet.createdBy?.email}) on {new Date(selectedSet.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSet(null)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition"
                >
                  ✕ Close
                </button>
              </div>

              {/* Tabs Inside Modal */}
              <div className="flex border-b border-slate-200 bg-slate-50 px-6">
                <button
                  onClick={() => setDetailTab('questions')}
                  className={`px-4 py-3 text-xs font-bold border-b-2 transition ${
                    detailTab === 'questions' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Questions Review ({selectedSet.questions?.length || 0})
                </button>
                <button
                  onClick={() => setDetailTab('results')}
                  className={`px-4 py-3 text-xs font-bold border-b-2 transition ${
                    detailTab === 'results' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Student Marks / Results ({attempts.length})
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {detailTab === 'questions' ? (
                  <div className="space-y-6">
                    {/* Filter Questions by Type */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500 mr-2">Filter by Type:</span>
                      {['all', ...getUniqueQuestionTypes(selectedSet.questions)].map(type => (
                        <button
                          key={type}
                          onClick={() => setSelectedQuestionType(type)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition ${
                            selectedQuestionType === type
                              ? 'bg-brand-50 text-brand-600 border border-brand-200'
                              : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {type === 'all' ? 'All Types' : type}
                        </button>
                      ))}
                    </div>

                    {/* Question List */}
                    <div className="space-y-4">
                      {selectedSet.questions
                        .filter(q => selectedQuestionType === 'all' || q.question?.type === selectedQuestionType)
                        .map((q, idx) => {
                          if (!q.question) return null;
                          return (
                            <div key={q.question.id} className="p-5 border border-slate-200 bg-white shadow-sm rounded-2xl space-y-2 relative">
                              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <span className="text-xs font-bold text-slate-600">Question #{idx + 1}</span>
                                <div className="flex gap-2">
                                  <span className="px-2 py-0.5 rounded bg-brand-50 text-brand-600 border border-brand-200 text-[9px] font-bold uppercase">{q.question.type}</span>
                                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200 text-[9px] font-bold uppercase">{q.question.difficulty}</span>
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold uppercase">{q.question.content?.marks || 1} Marks</span>
                                </div>
                              </div>
                              {renderQuestionDetail(q.question)}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  // Student results view
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-brand-600">Student Attempts & Marks</h4>
                    <div className="border border-slate-200 rounded-xl bg-slate-50 overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-100 text-slate-600 font-bold">
                            <th className="px-4 py-3">Student Name</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Submitted At</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Marks Obtained</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-700">
                          {loadingAttempts ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                Loading student performance data...
                              </td>
                            </tr>
                          ) : attempts.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                No students have attempted this assessment test yet.
                              </td>
                            </tr>
                          ) : (
                            attempts.map((attempt) => (
                              <tr key={attempt.id} className="hover:bg-slate-100/50 bg-white">
                                <td className="px-4 py-3 font-semibold text-slate-900">{attempt.user?.name || 'Student'}</td>
                                <td className="px-4 py-3 text-slate-600">{attempt.user?.email}</td>
                                <td className="px-4 py-3 text-slate-600">
                                  {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                                    attempt.submissionStatus === 'submitted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
                                  }`}>
                                    {attempt.submissionStatus}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-900">
                                  {attempt.score !== null ? `${attempt.score} / ${attempt.maxScore}` : 'Pending'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* HOD Review Status Message */}
              {selectedSet.hodComment && (
                <div className="mx-6 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 text-left">
                  <span className="font-bold">Current HOD Feedback: </span> {selectedSet.hodComment}
                </div>
              )}

              {/* Modal Footer (Workflow Actions) */}
              <div className="p-6 border-t border-slate-200 bg-slate-50 flex flex-col gap-4">
                
                {actionType ? (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700">
                      Provide Reason/Comments for {actionType === 'reject' ? 'Rejection' : 'Regeneration Request'}
                    </label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Enter feedback details for the faculty member..."
                      rows={3}
                      className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setActionType(null);
                          setReviewComment('');
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={submittingAction}
                        onClick={() => handleReviewSubmit(selectedSet.id, actionType === 'reject' ? 'reject' : 'regenerate-request')}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition ${
                          actionType === 'reject' ? 'bg-red-600 hover:bg-red-500' : 'bg-cyan-600 hover:bg-cyan-500'
                        }`}
                      >
                        {submittingAction ? 'Submitting...' : actionType === 'reject' ? 'Confirm Rejection' : 'Confirm Request'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="text-xs text-slate-600">
                      Please audit carefully before selecting an action.
                    </div>
                    <div className="flex gap-2">
                      {selectedSet.status === 'pending_approval' && (
                        <>
                          <button
                            onClick={() => setActionType('reject')}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl px-4 py-2 text-xs font-bold transition"
                          >
                            Reject Set
                          </button>
                          <button
                            onClick={() => setActionType('regenerate')}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 rounded-xl px-4 py-2 text-xs font-bold transition"
                          >
                            Request Regeneration
                          </button>
                          <button
                            disabled={submittingAction}
                            onClick={() => handleApprove(selectedSet.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2 text-xs font-black transition shadow-lg shadow-emerald-500/20"
                          >
                            {submittingAction ? 'Approving...' : 'Approve & Publish'}
                          </button>
                        </>
                      )}
                      {selectedSet.status !== 'pending_approval' && (
                        <button
                          onClick={() => setSelectedSet(null)}
                          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl px-5 py-2 text-xs font-bold transition"
                        >
                          Close Review
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

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
