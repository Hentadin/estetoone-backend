import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { EnvConfig } from '../../config/env.validation';
import { JwtPayload } from './types/jwt-payload.type';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  issueAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', { infer: true }),
    });
  }

  issueRefreshToken(): { token: string; tokenHash: string; expiresAt: Date } {
    const token = randomBytes(48).toString('hex');
    const tokenHash = this.hashRefreshToken(token);
    const expiresAt = this.getRefreshExpiryDate();

    return { token, tokenHash, expiresAt };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  getRefreshExpiryDate(): Date {
    const expiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', { infer: true });
    return this.addDuration(new Date(), expiresIn);
  }

  getRefreshCookieOptions() {
    const isProduction = this.configService.get('NODE_ENV', { infer: true }) === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      path: '/',
      maxAge: this.getRefreshMaxAgeMs(),
    };
  }

  getClearRefreshCookieOptions() {
    const isProduction = this.configService.get('NODE_ENV', { infer: true }) === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      path: '/',
    };
  }

  private getRefreshMaxAgeMs(): number {
    const expiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', { infer: true });
    const match = expiresIn.match(/^(\d+)([dhms])$/);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const value = Number(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'm':
        return value * 60 * 1000;
      case 's':
        return value * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private addDuration(from: Date, duration: string): Date {
    const result = new Date(from);
    const match = duration.match(/^(\d+)([dhms])$/);
    if (!match) {
      result.setDate(result.getDate() + 7);
      return result;
    }

    const value = Number(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'd':
        result.setDate(result.getDate() + value);
        break;
      case 'h':
        result.setHours(result.getHours() + value);
        break;
      case 'm':
        result.setMinutes(result.getMinutes() + value);
        break;
      case 's':
        result.setSeconds(result.getSeconds() + value);
        break;
      default:
        result.setDate(result.getDate() + 7);
    }

    return result;
  }
}
