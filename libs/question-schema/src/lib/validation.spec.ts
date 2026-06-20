import { ValidationService } from './validation.service';
import { QuestionType } from './question.schema';
import { BadRequestException } from '@nestjs/common';

describe('Strict Zod Schema Validation', () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = new ValidationService();
  });

  describe('TrueFalseQuestionSchema', () => {
    it('should validate a perfect TrueFalse question', () => {
      const validData = {
        id: 101,
        marks: 5,
        question: {
          hide_text: false,
          text: 'The sky is blue.',
          read_text: true,
          image: ''
        },
        correctAnswer: true,
        explanation: 'Rayleigh scattering causes the sky to appear blue.'
      };

      const result = validationService.validateQuestion(QuestionType.trueFalse, validData);
      expect(result).toBeDefined();
      expect(result.id).toBe(101);
    });

    it('should fail if an extra property is present (testing .strict())', () => {
      const invalidDataWithExtraField = {
        id: 101,
        marks: 5,
        question: {
          hide_text: false,
          text: 'The sky is blue.',
          read_text: true,
          image: ''
        },
        correctAnswer: true,
        explanation: '...',
        unexpectedField: 'this should cause a failure' // <-- Extra property
      };

      expect(() => {
        validationService.validateQuestion(QuestionType.trueFalse, invalidDataWithExtraField);
      }).toThrow(BadRequestException);
      
      try {
        validationService.validateQuestion(QuestionType.trueFalse, invalidDataWithExtraField);
      } catch (e: any) {
        expect(e.message).toContain('Strict Validation Failed');
        expect(e.message).toContain("Unrecognized key(s) in object: 'unexpectedField'");
      }
    });

    it('should fail if explanation is missing', () => {
      const missingExplanationData = {
        id: 101,
        marks: 5,
        question: {
          hide_text: false,
          text: 'The sky is blue.',
          read_text: true,
          image: ''
        },
        correctAnswer: true
        // explanation is missing
      };

      expect(() => {
        validationService.validateQuestion(QuestionType.trueFalse, missingExplanationData);
      }).toThrow(BadRequestException);
      
      try {
        validationService.validateQuestion(QuestionType.trueFalse, missingExplanationData);
      } catch (e: any) {
        expect(e.message).toContain('explanation: Required');
      }
    });

    it('should fail if question object has extra properties', () => {
      const invalidNestedData = {
        id: 101,
        marks: 5,
        question: {
          hide_text: false,
          text: 'The sky is blue.',
          read_text: true,
          image: '',
          extraNestedField: 'fail' // <-- Extra nested property
        },
        correctAnswer: true,
        explanation: '...'
      };

      expect(() => {
        validationService.validateQuestion(QuestionType.trueFalse, invalidNestedData);
      }).toThrow(BadRequestException);
    });
  });
});
