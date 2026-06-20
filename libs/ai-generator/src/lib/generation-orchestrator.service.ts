import { Injectable, Logger } from '@nestjs/common';
import { OpenRouterService } from './openrouter.service';
import { GenerationRequest, GenerationResult } from './types/generation.types';

@Injectable()
export class GenerationOrchestratorService {
  private readonly logger = new Logger(GenerationOrchestratorService.name);

  // Maximum number of API calls per request to prevent infinite loops
  private readonly MAX_ORCHESTRATION_LOOPS = 5;
  // Maximum number of questions to request in a single batch
  private readonly MAX_BATCH_SIZE = 10;

  constructor(private readonly openRouterService: OpenRouterService) {}

  /**
   * Orchestrates the generation of an exact number of unique questions.
   */
  async generateExact(request: GenerationRequest): Promise<GenerationResult> {
    const { topic, type, difficulty, count, marksPerQuestion, contextText } = request;
    
    if (count <= 0) {
      return { success: true, questions: [], requestedCount: count, actualCount: 0 };
    }

    const uniqueQuestions: any[] = [];
    const seenHashes = new Set<string>();
    let attempts = 0;

    this.logger.log(`Starting generation orchestration for ${count} ${type} questions on "${topic}"`);

    while (uniqueQuestions.length < count && attempts < this.MAX_ORCHESTRATION_LOOPS) {
      attempts++;
      const neededCount = count - uniqueQuestions.length;
      
      // Cap batch size to avoid overwhelming the model or exceeding token limits
      const batchRequestCount = Math.min(neededCount + 2, this.MAX_BATCH_SIZE); // Request slight buffer

      this.logger.debug(`Loop ${attempts}: Need ${neededCount}, Requesting batch of ${batchRequestCount}...`);

      try {
        const generatedBatch = await this.openRouterService.generateQuestionsBatch(
          topic,
          type,
          difficulty,
          batchRequestCount,
          marksPerQuestion,
          contextText
        );

        for (const question of generatedBatch) {
          // Normalize text to create a simple uniqueness hash
          const textHash = this.normalizeTextHash(question.question?.text || JSON.stringify(question));
          
          if (!seenHashes.has(textHash)) {
            seenHashes.add(textHash);
            
            // Assign global unique ID using a random large integer
            // Prisma schema for DB uses UUID, but the Zod validation strictly requires integer > 0
            question.id = Math.floor(Math.random() * 1000000000) + 1;
            
            uniqueQuestions.push(question);

            if (uniqueQuestions.length === count) {
              break; // Reached exact count
            }
          } else {
            this.logger.warn('Duplicate question detected and skipped.');
          }
        }
      } catch (error: any) {
        this.logger.error(`Generation loop ${attempts} failed:`, error.message);
        // Continue to next loop if we still have attempts left
      }
    }

    // Trimming logic (safety net in case the loop over-accumulates)
    const finalQuestions = uniqueQuestions.slice(0, count);
    
    const success = finalQuestions.length === count;
    
    if (!success) {
      this.logger.warn(`Failed to generate exact count. Requested: ${count}, Actual: ${finalQuestions.length}`);
    } else {
      this.logger.log(`Successfully generated exactly ${count} unique questions.`);
    }

    return {
      success,
      questions: finalQuestions,
      requestedCount: count,
      actualCount: finalQuestions.length,
      message: success 
        ? 'Generation completed successfully' 
        : `Partial generation completed. Missing ${count - finalQuestions.length} questions.`,
    };
  }

  /**
   * Helper to normalize question text for duplicate detection
   */
  private normalizeTextHash(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}
