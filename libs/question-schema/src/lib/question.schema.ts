import { z } from 'zod';

export enum QuestionType {
  fillInBlanks = 'fillInBlanks',
  multipleChoice = 'multipleChoice',
  multiSelect = 'multiSelect',
  matchTheFollowing = 'matchTheFollowing',
  reordering = 'reordering',
  sorting = 'sorting',
  trueFalse = 'trueFalse',
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

// 1. Common embedded question prompt/media structure
export const CommonQuestionPropSchema = z.object({
  hide_text: z.boolean(),
  text: z.string(),
  read_text: z.boolean(),
  image: z.string(), // Image reference/URL or empty string
}).strict();

// 2. Individual Question Schemas per Type

export const FillInBlanksQuestionSchema = z.object({
  id: z.number().int().positive(),
  marks: z.number(),
  question: CommonQuestionPropSchema,
  correctAnswer: z.string(),
  alternatives: z.array(z.string()),
  explanation: z.string(), // Mandatory explanation
}).strict();

export const MultipleChoiceQuestionSchema = z.object({
  id: z.number().int().positive(),
  marks: z.number(),
  question: CommonQuestionPropSchema,
  options: z.array(CommonQuestionPropSchema).min(2),
  correctAnswer: z.string(),
  explanation: z.string(),
}).strict();

export const MultiSelectQuestionSchema = z.object({
  id: z.number().int().positive(),
  marks: z.number(),
  question: CommonQuestionPropSchema,
  options: z.array(CommonQuestionPropSchema).min(2),
  correctAnswer: z.array(z.string()).min(1),
  explanation: z.string(),
}).strict();

export const MatchTheFollowingQuestionSchema = z.object({
  id: z.number().int().positive(),
  marks: z.number(),
  question: CommonQuestionPropSchema,
  leftItems: z.array(z.string()).min(1),
  rightItems: z.array(z.string()).min(1),
  correctAnswer: z.array(
    z.object({
      left: z.string(),
      right: z.string(),
    }).strict()
  ).min(1),
  explanation: z.string(),
}).strict();

export const ReorderingQuestionSchema = z.object({
  id: z.number().int().positive(),
  marks: z.number(),
  question: CommonQuestionPropSchema,
  items: z.array(z.string()).min(2),
  correctAnswer: z.array(z.string()).min(2),
  explanation: z.string(),
}).strict();

export const SortingQuestionSchema = z.object({
  id: z.number().int().positive(),
  marks: z.number(),
  question: CommonQuestionPropSchema,
  categories: z.array(z.string()).min(1),
  items: z.array(z.string()).min(1),
  correctAnswer: z.record(z.string(), z.array(z.string())),
  explanation: z.string(),
}).strict();

export const TrueFalseQuestionSchema = z.object({
  id: z.number().int().positive(),
  marks: z.number(),
  question: CommonQuestionPropSchema,
  correctAnswer: z.boolean(),
  explanation: z.string(),
}).strict();

// 3. Question Block Schemas mapping exported structures

// 3. Question Block Schemas mapping exported structures (Unrefined objects for discriminatedUnion)

export const FillInBlanksBlockObject = z.object({
  questionType: z.literal(QuestionType.fillInBlanks),
  totalMarks: z.number(),
  questions: z.array(FillInBlanksQuestionSchema),
});

export const MultipleChoiceBlockObject = z.object({
  questionType: z.literal(QuestionType.multipleChoice),
  totalMarks: z.number(),
  questions: z.array(MultipleChoiceQuestionSchema),
});

export const MultiSelectBlockObject = z.object({
  questionType: z.literal(QuestionType.multiSelect),
  totalMarks: z.number(),
  questions: z.array(MultiSelectQuestionSchema),
});

export const MatchTheFollowingBlockObject = z.object({
  questionType: z.literal(QuestionType.matchTheFollowing),
  totalMarks: z.number(),
  questions: z.array(MatchTheFollowingQuestionSchema),
});

export const ReorderingBlockObject = z.object({
  questionType: z.literal(QuestionType.reordering),
  totalMarks: z.number(),
  questions: z.array(ReorderingQuestionSchema),
});

export const SortingBlockObject = z.object({
  questionType: z.literal(QuestionType.sorting),
  totalMarks: z.number(),
  questions: z.array(SortingQuestionSchema),
});

export const TrueFalseBlockObject = z.object({
  questionType: z.literal(QuestionType.trueFalse),
  totalMarks: z.number(),
  questions: z.array(TrueFalseQuestionSchema),
});

// Refined schemas exported for individual usage
const validateTotalMarks = (data: { totalMarks: number; questions: Array<{ marks: number }> }) =>
  data.totalMarks === data.questions.reduce((sum, q) => sum + q.marks, 0);

const totalMarksErrorMessage = { message: "totalMarks must equal the sum of marks in questions block" };

export const FillInBlanksBlockSchema = FillInBlanksBlockObject.refine(validateTotalMarks, totalMarksErrorMessage);
export const MultipleChoiceBlockSchema = MultipleChoiceBlockObject.refine(validateTotalMarks, totalMarksErrorMessage);
export const MultiSelectBlockSchema = MultiSelectBlockObject.refine(validateTotalMarks, totalMarksErrorMessage);
export const MatchTheFollowingBlockSchema = MatchTheFollowingBlockObject.refine(validateTotalMarks, totalMarksErrorMessage);
export const ReorderingBlockSchema = ReorderingBlockObject.refine(validateTotalMarks, totalMarksErrorMessage);
export const SortingBlockSchema = SortingBlockObject.refine(validateTotalMarks, totalMarksErrorMessage);
export const TrueFalseBlockSchema = TrueFalseBlockObject.refine(validateTotalMarks, totalMarksErrorMessage);

// 4. Combined Export Schemas (Section 1 of schema.md)
export const QuestionBlockSchema = z.discriminatedUnion('questionType', [
  FillInBlanksBlockObject,
  MultipleChoiceBlockObject,
  MultiSelectBlockObject,
  MatchTheFollowingBlockObject,
  ReorderingBlockObject,
  SortingBlockObject,
  TrueFalseBlockObject,
]).superRefine((data, ctx) => {
  const sum = data.questions.reduce((s, q) => s + q.marks, 0);
  if (data.totalMarks !== sum) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "totalMarks must equal the sum of marks in questions block",
      path: ["totalMarks"]
    });
  }
});

export const ExportedFileSchema = z.array(QuestionBlockSchema).min(1);

// 5. Inferred TypeScript Types
export type FillInBlanksQuestion = z.infer<typeof FillInBlanksQuestionSchema>;
export type MultipleChoiceQuestion = z.infer<typeof MultipleChoiceQuestionSchema>;
export type MultiSelectQuestion = z.infer<typeof MultiSelectQuestionSchema>;
export type MatchTheFollowingQuestion = z.infer<typeof MatchTheFollowingQuestionSchema>;
export type ReorderingQuestion = z.infer<typeof ReorderingQuestionSchema>;
export type SortingQuestion = z.infer<typeof SortingQuestionSchema>;
export type TrueFalseQuestion = z.infer<typeof TrueFalseQuestionSchema>;

export type QuestionBlock = z.infer<typeof QuestionBlockSchema>;
export type ExportedFile = z.infer<typeof ExportedFileSchema>;
export type CommonQuestionProp = z.infer<typeof CommonQuestionPropSchema>;
