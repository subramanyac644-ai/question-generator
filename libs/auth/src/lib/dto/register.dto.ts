import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { Role } from '@qgp/database';

export class RegisterDto {
  @ApiProperty({ example: 'cse.teacher@qgp.edu', description: 'Unique email address of the user' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'd3b07384-d113-4956-a5db-e0e457f6b955', required: false, description: 'Optional user UUID' })
  @IsUUID()
  @IsOptional()
  id?: string;

  @ApiProperty({ example: 'Password123!', minLength: 8, required: false, description: 'Secure user password' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ example: 'Prof. Charles Xavier', required: false, description: 'Optional display name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ enum: Role, example: Role.TEACHER, description: 'System authorization role' })
  @IsEnum(Role)
  @IsNotEmpty()
  role!: Role;

  @ApiProperty({ example: 'd3b07384-d113-4956-a5db-e0e457f6b955', required: false, description: 'Optional UUID department reference' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;
}
