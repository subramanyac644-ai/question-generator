'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { QuestionType, Difficulty } from '@qgp/question-schema';

interface GeneratorConfig {
  topic: string;
  type: QuestionType;
  difficulty: Difficulty;
  count: number;
  marksPerQuestion: number;
  sourceDocumentId: string | null;
  sourceDocumentTitle: string | null;
  timeLimitMinutes: number;
  startDate: string;
  endDate: string;
  negativeMarking: number;
  randomizeOrder: boolean;
}

interface TeacherWorkflowState {
  selectedDocumentId: string | null;
  setSelectedDocumentId: (id: string | null) => void;
  config: GeneratorConfig;
  setConfig: (config: Partial<GeneratorConfig>) => void;
  generatedQuestions: any[];
  setGeneratedQuestions: (questions: any[]) => void;
  updateQuestion: (index: number, updatedQuestion: any) => void;
  questionSetId: string | null;
  setQuestionSetId: (id: string | null) => void;
  creationMode: 'MANUAL' | 'AI';
  setCreationMode: (mode: 'MANUAL' | 'AI') => void;
}

const TeacherContext = createContext<TeacherWorkflowState | undefined>(undefined);

export function TeacherProvider({ children }: { children: ReactNode }) {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [questionSetId, setQuestionSetId] = useState<string | null>(null);
  const [config, setConfigState] = useState<GeneratorConfig>({
    topic: '',
    type: QuestionType.multipleChoice,
    difficulty: Difficulty.MEDIUM,
    count: 5,
    marksPerQuestion: 1,
    sourceDocumentId: null,
    sourceDocumentTitle: null,
    timeLimitMinutes: 30,
    startDate: '',
    endDate: '',
    negativeMarking: 0,
    randomizeOrder: false,
  });
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [creationMode, setCreationMode] = useState<'MANUAL' | 'AI'>('AI');

  const setConfig = (newConfig: Partial<GeneratorConfig>) => {
    setConfigState((prev) => ({ ...prev, ...newConfig }));
  };

  const updateQuestion = (index: number, updatedQuestion: any) => {
    setGeneratedQuestions((prev) => {
      const copy = [...prev];
      copy[index] = updatedQuestion;
      return copy;
    });
  };

  return (
    <TeacherContext.Provider
      value={{
        selectedDocumentId,
        setSelectedDocumentId,
        config,
        setConfig,
        generatedQuestions,
        setGeneratedQuestions,
        updateQuestion,
        questionSetId,
        setQuestionSetId,
        creationMode,
        setCreationMode,
      }}
    >
      {children}
    </TeacherContext.Provider>
  );
}

export function useTeacherWorkflow() {
  const context = useContext(TeacherContext);
  if (!context) {
    throw new Error('useTeacherWorkflow must be used within a TeacherProvider');
  }
  return context;
}
