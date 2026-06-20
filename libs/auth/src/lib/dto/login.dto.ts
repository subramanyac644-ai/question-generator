import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'cse.teacher@qgp.edu', description: 'User account email' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Password123!', description: 'User account password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
