import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '@qgp/database';
import * as fs from 'fs';
import * as path from 'path';
// Use require for pdf-parse as it often has issues with default ES imports
const pdfParse = require('pdf-parse');
import { cleanText } from './utils/text-cleaner.util';
import { chunkText } from './utils/chunker.util';

@Injectable()
export class PdfProcessorService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Processes a PDF document: extracts text, cleans it, chunks it, and saves to database.
   */
  async processDocument(documentId: string) {
    // 1. Fetch document from DB
    const document = await this.databaseService.sourceDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID "${documentId}" not found.`);
    }

    if (document.processingStatus === 'ready') {
      // Idempotent: return existing chunks
      return this.getDocumentChunks(documentId);
    }

    // Mark as processing
    await this.databaseService.sourceDocument.update({
      where: { id: documentId },
      data: { processingStatus: 'processing' },
    });

    try {
      // 2. Read file from disk
      // fileUrl is stored as '/uploads/doc-xxx.pdf'; strip the leading slash for cross-platform path.join
      const relativePath = document.fileUrl.startsWith('/') ? document.fileUrl.slice(1) : document.fileUrl;
      const filePath = path.join(process.cwd(), relativePath);
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException(`File not found on disk: ${document.fileUrl}`);
      }

      const dataBuffer = fs.readFileSync(filePath);

      // 3. Extract text using pdf-parse
      const pdfData = await pdfParse(dataBuffer);
      const rawText = pdfData.text;

      if (!rawText || rawText.trim().length === 0) {
        throw new BadRequestException('No extractable text found in this PDF.');
      }

      // 4. Clean text
      const cleanedText = cleanText(rawText);

      // 5. Semantic Chunking
      const chunks = chunkText(cleanedText);

      if (chunks.length === 0) {
        throw new BadRequestException('Text extraction resulted in 0 chunks.');
      }

      // 6. Save Chunks to Database
      // First, clear any existing chunks for this document (e.g. from a previous failed run)
      await this.databaseService.documentChunk.deleteMany({
        where: { sourceDocumentId: documentId },
      });

      const dbChunks = chunks.map((chunk, index) => ({
        sourceDocumentId: documentId,
        chunkIndex: index,
        chunkText: chunk.text,
        charCount: chunk.charCount,
        wordCount: chunk.wordCount,
        // Optional: estimate page number if needed
        // pageNumber: Math.floor((index / chunks.length) * pdfData.numpages) + 1
      }));

      await this.databaseService.documentChunk.createMany({
        data: dbChunks,
      });

      // 7. Update Document Status
      await this.databaseService.sourceDocument.update({
        where: { id: documentId },
        data: {
          processingStatus: 'ready',
          extractedText: cleanedText,
          pageCount: pdfData.numpages,
          wordCount: chunks.reduce((sum, c) => sum + c.wordCount, 0),
        },
      });

      return {
        message: 'Document processed successfully',
        chunkCount: chunks.length,
        pageCount: pdfData.numpages,
      };
    } catch (error: any) {
      console.error('PDF Processing Error:', error);
      
      // Mark as failed
      await this.databaseService.sourceDocument.update({
        where: { id: documentId },
        data: { processingStatus: 'failed' },
      });

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(`PDF processing failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Retrieves stored chunks for a document.
   */
  async getDocumentChunks(documentId: string) {
    const document = await this.databaseService.sourceDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID "${documentId}" not found.`);
    }

    const chunks = await this.databaseService.documentChunk.findMany({
      where: { sourceDocumentId: documentId },
      orderBy: { chunkIndex: 'asc' },
    });

    return {
      documentId,
      status: document.processingStatus,
      chunkCount: chunks.length,
      chunks,
    };
  }

  /**
   * Retrieves processing status
   */
  async getProcessingStatus(documentId: string) {
    const document = await this.databaseService.sourceDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        processingStatus: true,
        pageCount: true,
        wordCount: true,
      }
    });

    if (!document) {
      throw new NotFoundException(`Document with ID "${documentId}" not found.`);
    }

    return document;
  }

  /**
   * Forces a fresh reprocess of a document, clearing previous chunks and status.
   * Useful when initial processing failed or content needs to be refreshed.
   */
  async reprocessDocument(documentId: string) {
    const document = await this.databaseService.sourceDocument.findUnique({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException(`Document with ID "${documentId}" not found.`);
    }

    // Reset status so processDocument will re-extract instead of returning cached
    await this.databaseService.sourceDocument.update({
      where: { id: documentId },
      data: { processingStatus: 'pending', extractedText: null },
    });

    return this.processDocument(documentId);
  }
}

