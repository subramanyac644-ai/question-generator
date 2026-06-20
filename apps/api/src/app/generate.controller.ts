import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '@qgp/auth';
import { GenerationOrchestratorService } from '@qgp/ai-generator';
import { DatabaseService } from '@qgp/database';
import { PdfProcessorService } from '@qgp/pdf-processor';

@Controller('generate')
@UseGuards(JwtAuthGuard)
export class GenerateController {
  constructor(
    private readonly orchestratorService: GenerationOrchestratorService,
    private readonly databaseService: DatabaseService,
    private readonly pdfProcessorService: PdfProcessorService
  ) {}

  @Post('batch')
  async generateBatch(@Body() body: any) {
    let topic = body.topic || '';
    const sourceDocumentId = body.sourceDocumentId;
    let contextText = '';

    if (sourceDocumentId) {
      try {
        // 1. Process document to make sure it's ready and chunks are saved
        const doc = await this.databaseService.sourceDocument.findUnique({
          where: { id: sourceDocumentId },
        });

        if (!doc) {
          throw new BadRequestException(
            `Source document not found in the database. This usually happens if the database was reset or migrated. Please click the "Clear" button next to "Generating from: ${body.topic || 'dd'}" and upload the PDF file again.`
          );
        }

        // If not ready, process it now to block and get it ready
        if (doc.processingStatus !== 'ready') {
          await this.pdfProcessorService.processDocument(sourceDocumentId);
        }

        // 2. Fetch all chunks
        const chunks = await this.databaseService.documentChunk.findMany({
          where: { sourceDocumentId },
          orderBy: { chunkIndex: 'asc' },
        });

        if (chunks.length === 0) {
          throw new BadRequestException('The uploaded PDF has no processed text chunks. Please try uploading it again.');
        }

        contextText = chunks.map((c) => c.chunkText).join('\n\n');

        // 3. When PDF is uploaded, questions are generated from PDF content alone.
        // Do NOT use document title as fallback topic — let the AI analyze the content directly.
        // Explicitly clear topic so only PDF content is used, never the title.
        topic = '';
      } catch (err: any) {
        throw new BadRequestException(`PDF Processing failed: ${err.message}`);
      }
    } else if (!topic.trim()) {
      throw new BadRequestException('A topic must be specified when no PDF is uploaded.');
    }

    // Parse multi-config or single-config structures
    const configs = body.configs || [];
    const difficultyDistribution = body.difficultyDistribution || { easy: 40, medium: 40, hard: 20 };

    if (configs.length === 0) {
      configs.push({
        type: body.type || 'multipleChoice',
        count: body.count || 5,
        marksPerQuestion: body.marksPerQuestion || 1,
      });
    }

    const allQuestions: any[] = [];
    const tasks: Promise<any>[] = [];

    for (const config of configs) {
      const { type, count, marksPerQuestion } = config;
      if (!count || count <= 0) continue;

      // Distribute count across easy, medium, hard
      const easyCount = Math.round((difficultyDistribution.easy / 100) * count);
      const mediumCount = Math.round((difficultyDistribution.medium / 100) * count);
      const hardCount = count - easyCount - mediumCount;

      const diffs = [
        { name: 'EASY', count: easyCount },
        { name: 'MEDIUM', count: mediumCount },
        { name: 'HARD', count: hardCount },
      ];

      for (const diff of diffs) {
        if (diff.count <= 0) continue;

        const task = (async () => {
          try {
            const result = await this.orchestratorService.generateExact({
              topic,
              type,
              difficulty: diff.name as any,
              count: diff.count,
              marksPerQuestion,
              contextText,
            });

            if (result.questions) {
              return result.questions.map((q: any) => ({
                ...q,
                type,
                difficulty: diff.name,
              }));
            }
          } catch (err) {
            console.error(`Failed to generate ${diff.count} ${type} questions (${diff.name}):`, err);
          }
          return [];
        })();

        tasks.push(task);
      }
    }

    const results = await Promise.all(tasks);
    for (const questions of results) {
      allQuestions.push(...questions);
    }

    const totalRequested = configs.reduce((sum: number, c: any) => sum + c.count, 0);

    return {
      success: allQuestions.length > 0,
      questions: allQuestions,
      requestedCount: totalRequested,
      actualCount: allQuestions.length,
      message: allQuestions.length > 0 
        ? 'Generation completed successfully' 
        : 'Failed to generate questions. Please verify your OpenRouter credentials or topic details.',
    };
  }
}
