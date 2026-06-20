import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService, TokenPayload } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Authentication Management')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new platform user' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'User account created successfully.' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'User with the given email already exists.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid user registration payloads.' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate credentials and obtain access token' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Authentication succeeded, tokens generated.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid email or password credentials.' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate and request a new access token' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Refresh token valid, new access token issued.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Refresh token is expired or invalid.' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out user and clear session' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Session ended successfully.' })
  async logout(@CurrentUser() user: TokenPayload) {
    // In stateless JWT setups, client purges credentials from storage.
    // Server logs the action for audit logs or handles list updates if blacklisted.
    return {
      message: `User ${user.email} successfully logged out.`,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile details of the current authenticated user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Successfully retrieved current user metadata.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid authentication token.' })
  async getProfile(@CurrentUser() user: TokenPayload) {
    return user;
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full database profile of the current authenticated user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Successfully retrieved current database profile.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid authentication token.' })
  async getDbProfile(@CurrentUser() user: TokenPayload) {
    return this.authService.getUserProfile(user.userId);
  }

  @Get('seed-dev-db')
  @ApiOperation({ summary: 'Seed the database with default dev credentials' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Seeding completed successfully.' })
  async seedDevDb() {
    return this.authService.seedDevDatabase();
  }
}
