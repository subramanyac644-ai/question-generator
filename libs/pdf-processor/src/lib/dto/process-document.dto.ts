import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class ProcessDocumentDto {
  @ApiProperty({ example: 'd3b07384-d113-4956-a5db-e0e457f6b955', description: 'SourceDocument UUID to process' })
  @IsUUID()
  @IsNotEmpty()
  documentId!: string;
}
