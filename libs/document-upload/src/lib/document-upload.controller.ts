import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser } from '@qgp/auth';
import { PermissionsGuard, RequirePermissions, Permission } from '@qgp/role-permission';
import { DocumentUploadService } from './document-upload.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { multerPdfOptions } from './multer.config';

/** Inline type — avoids needing @types/multer as a direct dependency */
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

@ApiTags('Document Management')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentUploadController {
  constructor(private readonly uploadService: DocumentUploadService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/documents/upload   — Teacher uploads a PDF
  // ─────────────────────────────────────────────────────────────────────────────
  @Post('upload')
  @RequirePermissions(Permission.UPLOAD_PDF)
  @UseInterceptors(FileInterceptor('file', multerPdfOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a PDF source document (Teacher only)',
    description:
      'Uploads a source PDF document (max 20 MB) to be parsed for question generation. ' +
      'The file is validated via magic bytes, saved locally, and its metadata is persisted to the database.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'departmentId'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF file to upload (max 20 MB)',
        },
        title: {
          type: 'string',
          description: 'Optional custom title. Defaults to the original filename.',
        },
        departmentId: {
          type: 'string',
          format: 'uuid',
          description: 'UUID of the department this document belongs to',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Document uploaded and saved successfully.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid file type, file too large, or missing fields.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden: Only TEACHERs can upload documents.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid JWT.' })
  async uploadFile(
    @UploadedFile() file: MulterFile,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('A PDF file is required.');
    }
    return this.uploadService.uploadPdf(file, dto, user.userId);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/documents   — List all uploaded documents (scoped by auth role)
  // ─────────────────────────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'List uploaded source documents',
    description: 'Returns metadata for all non-deleted source documents.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of documents returned.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid JWT.' })
  async getDocuments() {
    return this.uploadService.getDocuments();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/documents/:id   — Get a single document by ID
  // ─────────────────────────────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get a single source document by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Document record returned.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Document not found.' })
  async getDocument(@Param('id', ParseUUIDPipe) id: string) {
    return this.uploadService.getDocumentById(id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE /api/documents/:id   — Soft-delete a document (Teacher only)
  // ─────────────────────────────────────────────────────────────────────────────
  @Delete(':id')
  @RequirePermissions(Permission.UPLOAD_PDF)
  @ApiOperation({
    summary: 'Soft-delete a source document (Teacher only)',
    description: 'Marks the document as deleted in the database. The physical file is not removed.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Document soft-deleted successfully.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Document not found.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async deleteDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.uploadService.softDeleteDocument(id, user.userId);
  }
}
