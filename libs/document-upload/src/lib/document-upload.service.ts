import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '@qgp/database';
import * as fs from 'fs';
import * as path from 'path';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { PdfProcessorService } from '@qgp/pdf-processor';

@Injectable()
export class DocumentUploadService {
  private readonly uploadDir: string;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly pdfProcessorService: PdfProcessorService
  ) {
    // Save files locally in an 'uploads' directory in the project root
    this.uploadDir = path.join(process.cwd(), 'uploads');
    
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Validates and persists an uploaded PDF file, logging its metadata in the database.
   */
  async uploadPdf(file: any, dto: UploadDocumentDto, userId: string) {
    try {
      return await this.uploadPdfInternal(file, dto, userId);
    } catch (err: any) {
      const logMsg = `[Upload Error] ${new Date().toISOString()}\nMessage: ${err.message}\nStack: ${err.stack || ''}\n\n`;
      fs.appendFileSync(path.join(process.cwd(), 'upload_error.txt'), logMsg);
      throw err;
    }
  }

  async uploadPdfInternal(file: any, dto: UploadDocumentDto, userId: string) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }

    // 1. Validate Max Size (20MB = 20,971,520 bytes)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new BadRequestException(`File size exceeds the 20MB limit. Uploaded: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
    }

    // 2. Validate File Extension and Mimetype
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf' || file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Invalid file type. Only PDF files are allowed.');
    }

    // 3. Deep Validation: Validate Magic Bytes (%PDF- header)
    if (!file.buffer || file.buffer.length < 4) {
      throw new BadRequestException('Invalid file buffer.');
    }
    const magicNumber = file.buffer.slice(0, 4).toString('utf-8');
    if (magicNumber !== '%PDF') {
      throw new BadRequestException('File structure validation failed. The uploaded file is not a valid PDF document.');
    }

    // 4. Verify Department and User existence
    if (!dto.departmentId) {
      throw new BadRequestException('Department ID is required.');
    }
    const department = await this.databaseService.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!department) {
      throw new NotFoundException(`Department with ID "${dto.departmentId}" not found.`);
    }

    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found.`);
    }

    // 5. Generate Safe & Unique Filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeFilename = `doc-${uniqueSuffix}.pdf`;
    const filePath = path.join(this.uploadDir, safeFilename);

    try {
      // 6. Save File Locally
      await fs.promises.writeFile(filePath, file.buffer);
    } catch (error) {
      console.error('File saving failed:', error);
      throw new InternalServerErrorException('Failed to save the PDF file locally.');
    }

    // 7. Save Metadata in Database
    const fileTitle = dto.title || file.originalname.replace(/\.pdf$/i, '');
    const relativeUrl = `/uploads/${safeFilename}`;

    try {
      const sourceDocument = await this.databaseService.sourceDocument.create({
        data: {
          title: fileTitle,
          fileUrl: relativeUrl,
          fileType: 'PDF',
          fileSize: file.size,
          departmentId: dto.departmentId,
          uploadedById: userId,
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      // 8. Trigger PDF Processing asynchronously
      this.pdfProcessorService.processDocument(sourceDocument.id).catch(err => {
        console.error(`Background processing failed for document ${sourceDocument.id}:`, err);
      });

      return sourceDocument;
    } catch (dbError) {
      console.error('Database logging failed:', dbError);
      
      // Clean up local file if DB log fails
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      throw new InternalServerErrorException('Failed to record document metadata in the database.');
    }
  }

  /**
   * Helper to retrieve all uploaded source documents (optionally scoped by department)
   */
  async getDocuments(departmentId?: string) {
    return this.databaseService.sourceDocument.findMany({
      where: {
        departmentId: departmentId || undefined,
        deletedAt: null,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Retrieves a single document by its UUID.
   */
  async getDocumentById(id: string) {
    const doc = await this.databaseService.sourceDocument.findFirst({
      where: { id, deletedAt: null },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true, role: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });
    if (!doc) {
      throw new NotFoundException(`Document with ID "${id}" not found.`);
    }
    return doc;
  }

  /**
   * Soft-deletes a source document by setting deletedAt timestamp.
   * The physical file on disk is NOT removed.
   */
  async softDeleteDocument(id: string, _requestingUserId: string) {
    const doc = await this.databaseService.sourceDocument.findFirst({
      where: { id, deletedAt: null },
    });
    if (!doc) {
      throw new NotFoundException(`Document with ID "${id}" not found or already deleted.`);
    }
    return this.databaseService.sourceDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

