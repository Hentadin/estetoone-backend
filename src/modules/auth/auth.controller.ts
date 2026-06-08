import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ApiStandardErrors } from '../../common/decorators/swagger.decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { AuthResponseDto, MeResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { CheckEmailQueryDto } from './dto/check-email.dto';
import { RegisterDto } from './dto/register.dto';
import { ValidateRegistrationDto } from './dto/validate-registration.dto';
import { TokenService } from './token.service';
import { AuthenticatedUser } from './types/authenticated-user.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  @Get('check-email')
  @HttpCode(200)
  @ApiOperation({ summary: 'Check if email is available for registration' })
  @ApiOkResponse({ schema: { properties: { available: { type: 'boolean' } } } })
  checkEmail(@Query() query: CheckEmailQueryDto): Promise<{ available: boolean }> {
    return this.authService.checkEmailAvailability(query.email);
  }

  @Post('validate-registration')
  @HttpCode(200)
  @ApiOperation({ summary: 'Validate registration payload before signup' })
  @ApiOkResponse({ schema: { properties: { valid: { type: 'boolean', enum: [true] } } } })
  @ApiStandardErrors()
  validateRegistration(@Body() dto: ValidateRegistrationDto): Promise<{ valid: true }> {
    return this.authService.validateRegistration(dto);
  }

  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a new user (sets refresh_token cookie)' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiStandardErrors()
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { response, refreshToken } = await this.authService.register(dto);
    this.setRefreshCookie(res, refreshToken);
    return response;
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiStandardErrors()
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { response, refreshToken } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return response;
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Refresh access token using refresh_token cookie' })
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const refreshToken = req.cookies?.[AuthService.refreshCookieName] as string | undefined;
    const { response, refreshToken: newRefreshToken } =
      await this.authService.refresh(refreshToken);
    this.setRefreshCookie(res, newRefreshToken);
    return response;
  }

  @Post('logout')
  @HttpCode(204)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Logout and clear refresh cookie' })
  @ApiNoContentResponse()
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const refreshToken = req.cookies?.[AuthService.refreshCookieName] as string | undefined;
    await this.authService.logout(refreshToken);
    res.clearCookie(AuthService.refreshCookieName, this.tokenService.getClearRefreshCookieOptions());
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiOkResponse({ type: MeResponseDto })
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<MeResponseDto> {
    return this.authService.getMe(user);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete current user account' })
  @ApiNoContentResponse()
  @ApiStandardErrors()
  async deleteMe(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.deleteAccount(user);
    res.clearCookie(AuthService.refreshCookieName, this.tokenService.getClearRefreshCookieOptions());
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie(
      AuthService.refreshCookieName,
      refreshToken,
      this.tokenService.getRefreshCookieOptions(),
    );
  }
}
