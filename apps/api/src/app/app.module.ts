import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@qgp/auth';
import { RolePermissionModule } from '@qgp/role-permission';
import { DocumentUploadModule } from '@qgp/document-upload';
import { PdfProcessorModule } from '@qgp/pdf-processor';
import { AiGeneratorModule } from '@qgp/ai-generator';
import { DatabaseModule } from '@qgp/database';
import { AppController } from './app.controller';
import { GenerateController } from './generate.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    RolePermissionModule,
    DocumentUploadModule,
    PdfProcessorModule,
    AiGeneratorModule,
    DatabaseModule,
  ],
  controllers: [AppController, GenerateController],
  providers: [AppService],
})
export class AppModule {}
