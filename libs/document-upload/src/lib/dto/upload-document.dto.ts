import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadDocumentDto {
  @ApiProperty({
    description: 'Custom title for the document. If omitted, the uploaded file name will be used.',
    required: false,
    example: 'Software Engineering Lecture 1',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'The UUID of the department this document belongs to.',
    required: true,
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID()
  departmentId: string;
}
