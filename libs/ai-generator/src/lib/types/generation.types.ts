import { QuestionType, Difficulty, QuestionBlock } from '@qgp/question-schema';

export interface GenerationRequest {
  topic: string;
  type: QuestionType;
  difficulty: Difficulty;
  count: number;
  marksPerQuestion: number;
  contextText?: string; // Optional context from a document chunk
}

export interface GenerationResult {
  success: boolean;
  questions: any[]; // The validated array of questions
  requestedCount: number;
  actualCount: number;
  message?: string;
}
