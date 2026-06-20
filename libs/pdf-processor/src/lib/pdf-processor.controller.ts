import { Controller, Post, Get, Param, UseGuards, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PdfProcessorService } from './pdf-processor.service';
import { JwtAuthGuard } from '@qgp/auth';

@ApiTags('PDF Processing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class PdfProcessorController {
  constructor(private readonly pdfProcessorService: PdfProcessorService) {}

  // POST /api/documents/:id/process — Trigger PDF processing
  @Post(':id/process')
  @ApiOperation({
    summary: 'Trigger processing of an uploaded PDF document',
    description:
      'Reads the stored PDF, extracts text via pdf-parse, cleans it, splits it into ' +
      'semantic chunks, saves chunks to the database, and marks the document as ready.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Processing completed.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Document or file not found.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'PDF has no extractable text.' })
  async processDocument(@Param('id', ParseUUIDPipe) id: string) {
    return this.pdfProcessorService.processDocument(id);
  }

  // POST /api/documents/:id/reprocess — Force re-extraction (clears existing chunks)
  @Post(':id/reprocess')
  @ApiOperation({
    summary: 'Force reprocess a document (clears existing chunks)',
    description:
      'Resets processingStatus to pending and re-runs the full extraction pipeline. ' +
      'Use this when a previous run failed or when the source file was replaced.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reprocessing completed.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Document not found.' })
  async reprocessDocument(@Param('id', ParseUUIDPipe) id: string) {
    return this.pdfProcessorService.reprocessDocument(id);
  }

  // GET /api/documents/:id/chunks — Retrieve stored semantic chunks
  @Get(':id/chunks')
  @ApiOperation({ summary: 'Retrieve semantic chunks for a processed document' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Chunks returned successfully.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Document not found.' })
  async getChunks(@Param('id', ParseUUIDPipe) id: string) {
    return this.pdfProcessorService.getDocumentChunks(id);
  }

  // GET /api/documents/:id/status — Check processing status
  @Get(':id/status')
  @ApiOperation({ summary: 'Get current processing status of a document' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Status returned successfully.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Document not found.' })
  async getStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.pdfProcessorService.getProcessingStatus(id);
  }
}
