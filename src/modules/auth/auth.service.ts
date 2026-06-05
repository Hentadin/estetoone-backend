import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthRepository } from './auth.repository';
import { AuthResponseDto, MeResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ValidateRegistrationDto } from './dto/validate-registration.dto';
import { HashingService } from './hashing.service';
import { TokenService } from './token.service';
import { AuthenticatedUser } from './types/authenticated-user.type';

export interface AuthTokensResult {
  response: AuthResponseDto;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private static readonly REFRESH_COOKIE_NAME = 'refresh_token';

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly hashingService: HashingService,
    private readonly tokenService: TokenService,
  ) {}

  static get refreshCookieName(): string {
    return AuthService.REFRESH_COOKIE_NAME;
  }

  async register(dto: RegisterDto): Promise<AuthTokensResult> {
    if (dto.role === UserRole.admin) {
      throw new BadRequestException('Admin registration is not allowed');
    }

    if (dto.role === UserRole.doctor && (!dto.crm || !dto.mainSpecialty)) {
      throw new BadRequestException('CRM and mainSpecialty are required for doctor registration');
    }

    const existing = await this.authRepository.findUserByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.hashingService.hash(dto.password);
    const paymentPlan = await this.authRepository.findPaymentPlanByType(dto.planId);

    const profile =
      dto.role === UserRole.doctor
        ? {
            type: 'doctor' as const,
            data: {
              name: dto.name,
              crm: dto.crm!,
              mainSpecialty: dto.mainSpecialty!,
            },
          }
        : {
            type: 'patient' as const,
            data: {
              name: dto.name,
              phone: dto.phone,
              dateOfBirth: new Date(dto.dateOfBirth),
              gender: dto.gender,
              address: dto.address,
              emergencyContact: dto.emergencyContact,
              emergencyPhone: dto.emergencyPhone,
              behavioralData: dto.aiCommunicationStyle
                ? { aiCommunicationStyle: dto.aiCommunicationStyle }
                : undefined,
            },
          };

    const user = await this.authRepository.createUserWithProfile(
      {
        email: dto.email,
        passwordHash,
        role: dto.role,
        planId: paymentPlan?.id ?? null,
      },
      profile,
    );

    const displayName =
      user.patientProfile?.name ?? user.doctorProfile?.name ?? dto.name;

    return this.issueTokensForUser({
      id: user.id,
      email: user.email,
      role: user.role,
      name: displayName,
    });
  }

  async checkEmailAvailability(email: string): Promise<{ available: boolean }> {
    const existing = await this.authRepository.findUserByEmail(email);
    return { available: !existing };
  }

  async validateRegistration(dto: ValidateRegistrationDto): Promise<{ valid: true }> {
    const existing = await this.authRepository.findUserByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const paymentPlan = await this.authRepository.findPaymentPlanByType(dto.planId);
    if (!paymentPlan) {
      throw new BadRequestException(`Plan "${dto.planId}" is not available`);
    }

    if (!dto.aiCommunicationStyle) {
      throw new BadRequestException('aiCommunicationStyle is required');
    }

    return { valid: true };
  }

  async login(dto: LoginDto): Promise<AuthTokensResult> {
    const user = await this.authRepository.findUserByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await this.hashingService.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const fullUser = await this.authRepository.findUserById(user.id);
    const displayName =
      fullUser?.patientProfile?.name ?? fullUser?.doctorProfile?.name ?? undefined;

    return this.issueTokensForUser({
      id: user.id,
      email: user.email,
      role: user.role,
      name: displayName,
    });
  }

  async refresh(refreshToken: string | undefined): Promise<AuthTokensResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    const storedToken = await this.authRepository.findValidRefreshToken(tokenHash);

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.authRepository.deleteRefreshToken(storedToken.id);

    const user = await this.authRepository.findUserById(storedToken.userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const displayName =
      user.patientProfile?.name ?? user.doctorProfile?.name ?? undefined;

    return this.issueTokensForUser({
      id: user.id,
      email: user.email,
      role: user.role,
      name: displayName,
    });
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    const storedToken = await this.authRepository.findValidRefreshToken(tokenHash);

    if (storedToken) {
      await this.authRepository.deleteRefreshToken(storedToken.id);
    }
  }

  async getMe(user: AuthenticatedUser): Promise<MeResponseDto> {
    const fullUser = await this.authRepository.findUserById(user.id);

    if (!fullUser) {
      throw new UnauthorizedException('User not found');
    }

    let profile: Record<string, unknown> | null = null;

    if (fullUser.role === UserRole.patient && fullUser.patientProfile) {
      profile = {
        name: fullUser.patientProfile.name,
        phone: fullUser.patientProfile.phone,
        dateOfBirth: fullUser.patientProfile.dateOfBirth.toISOString().slice(0, 10),
        gender: fullUser.patientProfile.gender,
        address: fullUser.patientProfile.address,
        emergencyContact: fullUser.patientProfile.emergencyContact,
        emergencyPhone: fullUser.patientProfile.emergencyPhone,
      };
    } else if (fullUser.role === UserRole.doctor && fullUser.doctorProfile) {
      profile = {
        name: fullUser.doctorProfile.name,
        crm: fullUser.doctorProfile.crm,
        mainSpecialty: fullUser.doctorProfile.mainSpecialty,
        isOnline: fullUser.doctorProfile.isOnline,
      };
    }

    return {
      id: fullUser.id,
      email: fullUser.email,
      role: fullUser.role,
      planId: fullUser.planId,
      profile,
    };
  }

  async deleteAccount(user: AuthenticatedUser): Promise<void> {
    await this.authRepository.deleteRefreshTokensByUserId(user.id);
    await this.authRepository.deleteUser(user.id);
  }

  private async issueTokensForUser(user: {
    id: string;
    email: string;
    role: UserRole;
    name?: string;
  }): Promise<AuthTokensResult> {
    const accessToken = this.tokenService.issueAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const { token: refreshToken, tokenHash, expiresAt } =
      this.tokenService.issueRefreshToken();

    await this.authRepository.createRefreshToken(user.id, tokenHash, expiresAt);

    return {
      response: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        },
      },
      refreshToken,
    };
  }
}
