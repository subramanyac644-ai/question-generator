import { Test, TestingModule } from '@nestjs/testing';
import { PdfProcessorController } from './pdf-processor.controller';
import { PdfProcessorService } from './pdf-processor.service';
import { JwtAuthGuard } from '@qgp/auth';

describe('PdfProcessorController', () => {
  let controller: PdfProcessorController;
  let service: PdfProcessorService;

  const mockPdfProcessorService = {
    processDocument: jest.fn(),
    reprocessDocument: jest.fn(),
    getDocumentChunks: jest.fn(),
    getProcessingStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PdfProcessorController],
      providers: [
        {
          provide: PdfProcessorService,
          useValue: mockPdfProcessorService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PdfProcessorController>(PdfProcessorController);
    service = module.get<PdfProcessorService>(PdfProcessorService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('processDocument', () => {
    it('should delegate to service.processDocument', async () => {
      const docId = 'd3b07384-d113-4956-a5db-e0e457f6b955';
      const expectedResponse = { message: 'Document processed successfully', chunkCount: 5, pageCount: 1 };
      mockPdfProcessorService.processDocument.mockResolvedValue(expectedResponse);

      const result = await controller.processDocument(docId);

      expect(service.processDocument).toHaveBeenCalledWith(docId);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('reprocessDocument', () => {
    it('should delegate to service.reprocessDocument', async () => {
      const docId = 'd3b07384-d113-4956-a5db-e0e457f6b955';
      const expectedResponse = { message: 'Document processed successfully', chunkCount: 5, pageCount: 1 };
      mockPdfProcessorService.reprocessDocument.mockResolvedValue(expectedResponse);

      const result = await controller.reprocessDocument(docId);

      expect(service.reprocessDocument).toHaveBeenCalledWith(docId);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getChunks', () => {
    it('should delegate to service.getDocumentChunks', async () => {
      const docId = 'd3b07384-d113-4956-a5db-e0e457f6b955';
      const expectedResponse = {
        documentId: docId,
        status: 'ready',
        chunkCount: 2,
        chunks: [],
      };
      mockPdfProcessorService.getDocumentChunks.mockResolvedValue(expectedResponse);

      const result = await controller.getChunks(docId);

      expect(service.getDocumentChunks).toHaveBeenCalledWith(docId);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getStatus', () => {
    it('should delegate to service.getProcessingStatus', async () => {
      const docId = 'd3b07384-d113-4956-a5db-e0e457f6b955';
      const expectedResponse = {
        id: docId,
        processingStatus: 'ready',
        pageCount: 3,
        wordCount: 1500,
      };
      mockPdfProcessorService.getProcessingStatus.mockResolvedValue(expectedResponse);

      const result = await controller.getStatus(docId);

      expect(service.getProcessingStatus).toHaveBeenCalledWith(docId);
      expect(result).toEqual(expectedResponse);
    });
  });
});
