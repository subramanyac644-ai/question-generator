import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '@qgp/database';
import { PdfProcessorService } from './pdf-processor.service';
import * as fs from 'fs';

// Mock pdf-parse
jest.mock('pdf-parse', () => {
  return jest.fn().mockImplementation((buffer) => {
    if (buffer.toString() === 'EMPTY') {
      return Promise.resolve({ text: '', numpages: 0 });
    }
    if (buffer.toString() === 'ERROR') {
      return Promise.reject(new Error('PDF Parse Error'));
    }
    return Promise.resolve({
      text: 'This is page one text content.\n\nThis is page two text content. It is long enough to satisfy constraints.',
      numpages: 2,
    });
  });
});

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

describe('PdfProcessorService', () => {
  let service: PdfProcessorService;
  let databaseService: DatabaseService;

  const mockDatabaseService = {
    sourceDocument: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    documentChunk: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfProcessorService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<PdfProcessorService>(PdfProcessorService);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processDocument', () => {
    const docId = 'd3b07384-d113-4956-a5db-e0e457f6b955';
    const mockDocument = {
      id: docId,
      title: 'Test Document',
      fileUrl: '/uploads/doc-123.pdf',
      processingStatus: 'pending',
    };

    it('should process document successfully (happy path)', async () => {
      // 1. Setup mocks
      mockDatabaseService.sourceDocument.findUnique.mockResolvedValue(mockDocument);
      mockDatabaseService.sourceDocument.update.mockResolvedValue({
        ...mockDocument,
        processingStatus: 'ready',
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('VALID_PDF'));

      // 2. Call service method
      const result = await service.processDocument(docId);

      // 3. Asserts
      expect(databaseService.sourceDocument.findUnique).toHaveBeenCalledWith({
        where: { id: docId },
      });
      expect(databaseService.sourceDocument.update).toHaveBeenCalledWith({
        where: { id: docId },
        data: { processingStatus: 'processing' },
      });
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalled();
      
      // Check database chunk saving
      expect(databaseService.documentChunk.deleteMany).toHaveBeenCalledWith({
        where: { sourceDocumentId: docId },
      });
      expect(databaseService.documentChunk.createMany).toHaveBeenCalled();

      // Check final document update
      expect(databaseService.sourceDocument.update).toHaveBeenLastCalledWith({
        where: { id: docId },
        data: expect.objectContaining({
          processingStatus: 'ready',
          pageCount: 2,
        }),
      });

      expect(result).toEqual({
        message: 'Document processed successfully',
        chunkCount: expect.any(Number),
        pageCount: 2,
      });
    });

    it('should return existing chunks if document processingStatus is ready (idempotency)', async () => {
      const readyDocument = {
        ...mockDocument,
        processingStatus: 'ready',
      };
      const mockChunks = [{ id: 'c1', chunkIndex: 0, chunkText: 'Chunk 1', wordCount: 10, charCount: 20 }];
      
      mockDatabaseService.sourceDocument.findUnique.mockResolvedValue(readyDocument);
      mockDatabaseService.documentChunk.findMany.mockResolvedValue(mockChunks);

      const result = await service.processDocument(docId);

      expect(databaseService.sourceDocument.findUnique).toHaveBeenCalledWith({
        where: { id: docId },
      });
      // Should NOT update to processing
      expect(databaseService.sourceDocument.update).not.toHaveBeenCalled();
      // Should fetch and return chunks
      expect(databaseService.documentChunk.findMany).toHaveBeenCalledWith({
        where: { sourceDocumentId: docId },
        orderBy: { chunkIndex: 'asc' },
      });

      expect(result).toEqual({
        documentId: docId,
        status: 'ready',
        chunkCount: 1,
        chunks: mockChunks,
      });
    });

    it('should throw NotFoundException if document does not exist in DB', async () => {
      mockDatabaseService.sourceDocument.findUnique.mockResolvedValue(null);

      await expect(service.processDocument(docId)).rejects.toThrow(NotFoundException);
      expect(databaseService.sourceDocument.update).not.toHaveBeenCalled();
    });

    it('should update status to failed and throw NotFoundException if file is missing on disk', async () => {
      mockDatabaseService.sourceDocument.findUnique.mockResolvedValue(mockDocument);
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.processDocument(docId)).rejects.toThrow(NotFoundException);
      
      // Verify state was set to failed
      expect(databaseService.sourceDocument.update).toHaveBeenLastCalledWith({
        where: { id: docId },
        data: { processingStatus: 'failed' },
      });
    });

    it('should update status to failed and throw BadRequestException if extracted text is empty', async () => {
      mockDatabaseService.sourceDocument.findUnique.mockResolvedValue(mockDocument);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('EMPTY'));

      await expect(service.processDocument(docId)).rejects.toThrow(BadRequestException);
      
      expect(databaseService.sourceDocument.update).toHaveBeenLastCalledWith({
        where: { id: docId },
        data: { processingStatus: 'failed' },
      });
    });

    it('should update status to failed and throw InternalServerErrorException if pdf-parse fails', async () => {
      mockDatabaseService.sourceDocument.findUnique.mockResolvedValue(mockDocument);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('ERROR'));

      await expect(service.processDocument(docId)).rejects.toThrow(InternalServerErrorException);

      expect(databaseService.sourceDocument.update).toHaveBeenLastCalledWith({
        where: { id: docId },
        data: { processingStatus: 'failed' },
      });
    });
  });

  describe('getDocumentChunks', () => {
    const docId = 'd3b07384-d113-4956-a5db-e0e457f6b955';
    
    it('should retrieve stored chunks successfully', async () => {
      const mockDocument = { id: docId, processingStatus: 'ready' };
      const mockChunks = [
        { id: 'c1', chunkIndex: 0, chunkText: 'Text 1' },
        { id: 'c2', chunkIndex: 1, chunkText: 'Text 2' }
      ];

      mockDatabaseService.sourceDocument.findUnique.mockResolvedValue(mockDocument);
      mockDatabaseService.documentChunk.findMany.mockResolvedValue(mockChunks);

      const result = await service.getDocumentChunks(docId);

      expect(databaseService.sourceDocument.findUnique).toHaveBeenCalledWith({ where: { id: docId } });
      expect(databaseService.documentChunk.findMany).toHaveBeenCalledWith({
        where: { sourceDocumentId: docId },
        orderBy: { chunkIndex: 'asc' },
      });
      expect(result).toEqual({
        documentId: docId,
        status: 'ready',
        chunkCount: 2,
        chunks: mockChunks,
      });
    });

    it('should throw NotFoundException if document does not exist', async () => {
      mockDatabaseService.sourceDocument.findUnique.mockResolvedValue(null);

      await expect(service.getDocumentChunks(docId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProcessingStatus', () => {
    const docId = 'd3b07384-d113-4956-a5db-e0e457f6b955';

    it('should retrieve document status successfully', async () => {
      const mockStatus = { id: docId, processingStatus: 'processing', pageCount: null, wordCount: null };
      mockDatabaseService.sourceDocument.findUnique.mockResolvedValue(mockStatus);

      const result = await service.getProcessingStatus(docId);

      expect(databaseService.sourceDocument.findUnique).toHaveBeenCalledWith({
        where: { id: docId },
        select: {
          id: true,
          processingStatus: true,
          pageCount: true,
          wordCount: true,
        }
      });
      expect(result).toEqual(mockStatus);
    });

    it('should throw NotFoundException if document does not exist', async () => {
      mockDatabaseService.sourceDocument.findUnique.mockResolvedValue(null);

      await expect(service.getProcessingStatus(docId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reprocessDocument', () => {
    const docId = 'd3b07384-d113-4956-a5db-e0e457f6b955';
    const mockDocument = { id: docId, processingStatus: 'ready', fileUrl: '/uploads/doc-1.pdf' };

    it('should reset document state and trigger reprocessing', async () => {
      // Stub findUnique twice: once for reprocessDocument, once inside processDocument
      mockDatabaseService.sourceDocument.findUnique
        .mockResolvedValueOnce(mockDocument) // check in reprocessDocument
        .mockResolvedValueOnce({ ...mockDocument, processingStatus: 'pending' }); // check in processDocument helper

      mockDatabaseService.sourceDocument.update.mockResolvedValue({});
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('PDF_DATA'));

      const result = await service.reprocessDocument(docId);

      // Verify state was reset
      expect(databaseService.sourceDocument.update).toHaveBeenCalledWith({
        where: { id: docId },
        data: { processingStatus: 'pending', extractedText: null }
      });
      expect(result).toEqual({
        message: 'Document processed successfully',
        chunkCount: expect.any(Number),
        pageCount: 2,
      });
    });

    it('should throw NotFoundException if document does not exist', async () => {
      mockDatabaseService.sourceDocument.findUnique.mockResolvedValue(null);

      await expect(service.reprocessDocument(docId)).rejects.toThrow(NotFoundException);
    });
  });
});
