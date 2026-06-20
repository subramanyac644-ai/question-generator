import { Module } from '@nestjs/common';
import { DatabaseModule } from '@qgp/database';
import { AuthModule } from '@qgp/auth';
import { PdfProcessorService } from './pdf-processor.service';
import { PdfProcessorController } from './pdf-processor.controller';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PdfProcessorController],
  providers: [PdfProcessorService],
  exports: [PdfProcessorService],
})
export class PdfProcessorModule {}
