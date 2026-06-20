import { Module } from '@nestjs/common';
import { DatabaseModule } from '@qgp/database';
import { AuthModule } from '@qgp/auth';
import { PdfProcessorModule } from '@qgp/pdf-processor';
import { DocumentUploadService } from './document-upload.service';
import { DocumentUploadController } from './document-upload.controller';

@Module({
  imports: [DatabaseModule, AuthModule, PdfProcessorModule],
  controllers: [DocumentUploadController],
  providers: [DocumentUploadService],
  exports: [DocumentUploadService],
})
export class DocumentUploadModule {}
