import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { AuthResponseDto, MeResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenService } from './token.service';
import { AuthenticatedUser } from './types/authenticated-user.type';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  @Post('register')
  @HttpCode(201)
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
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const refreshToken = req.cookies?.[AuthService.refreshCookieName] as string | undefined;
    await this.authService.logout(refreshToken);
    res.clearCookie(AuthService.refreshCookieName, this.tokenService.getClearRefreshCookieOptions());
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<MeResponseDto> {
    return this.authService.getMe(user);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
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
