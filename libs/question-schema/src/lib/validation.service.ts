import { Injectable, BadRequestException } from '@nestjs/common';
import { ZodError } from 'zod';
import {
  QuestionType,
  FillInBlanksQuestionSchema,
  MultipleChoiceQuestionSchema,
  MultiSelectQuestionSchema,
  MatchTheFollowingQuestionSchema,
  ReorderingQuestionSchema,
  SortingQuestionSchema,
  TrueFalseQuestionSchema,
  QuestionBlockSchema
} from './question.schema';

@Injectable()
export class ValidationService {
  /**
   * Validates a single question object against its corresponding strict schema.
   * Throws a BadRequestException if validation fails or extra properties are present.
   */
  validateQuestion(type: QuestionType, data: any): any {
    try {
      switch (type) {
        case QuestionType.fillInBlanks:
          return FillInBlanksQuestionSchema.parse(data);
        case QuestionType.multipleChoice:
          return MultipleChoiceQuestionSchema.parse(data);
        case QuestionType.multiSelect:
          return MultiSelectQuestionSchema.parse(data);
        case QuestionType.matchTheFollowing:
          return MatchTheFollowingQuestionSchema.parse(data);
        case QuestionType.reordering:
          return ReorderingQuestionSchema.parse(data);
        case QuestionType.sorting:
          return SortingQuestionSchema.parse(data);
        case QuestionType.trueFalse:
          return TrueFalseQuestionSchema.parse(data);
        default:
          throw new BadRequestException(`Unsupported question type: ${type}`);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new BadRequestException(`Strict Validation Failed for ${type}: ${issues}`);
      }
      throw error;
    }
  }

  /**
   * Validates an entire block of questions (e.g. for export/import).
   */
  validateQuestionBlock(data: any): any {
    try {
      return QuestionBlockSchema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new BadRequestException(`Strict Validation Failed for Question Block: ${issues}`);
      }
      throw error;
    }
  }
}
