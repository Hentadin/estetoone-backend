import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthRepository } from '../../src/modules/auth/auth.repository';
import { AuthService } from '../../src/modules/auth/auth.service';
import { HashingService } from '../../src/modules/auth/hashing.service';
import { TokenService } from '../../src/modules/auth/token.service';
import { RegisterDto } from '../../src/modules/auth/dto/register.dto';

describe('AuthService', () => {
  const authRepository = {
    findUserByEmail: jest.fn(),
    findUserById: jest.fn(),
    findPaymentPlanByType: jest.fn(),
    createUserWithProfile: jest.fn(),
    createRefreshToken: jest.fn(),
    findValidRefreshToken: jest.fn(),
    deleteRefreshToken: jest.fn(),
    deleteRefreshTokensByUserId: jest.fn(),
    deleteUser: jest.fn(),
  } as unknown as AuthRepository;

  const hashingService = {
    hash: jest.fn(),
    compare: jest.fn(),
  } as unknown as HashingService;

  const tokenService = {
    issueAccessToken: jest.fn(),
    issueRefreshToken: jest.fn(),
    hashRefreshToken: jest.fn(),
  } as unknown as TokenService;

  const service = new AuthService(authRepository, hashingService, tokenService);

  const patientRegisterDto: RegisterDto = {
    email: 'new.patient@example.com',
    password: 'password123',
    name: 'New Patient',
    dateOfBirth: '1990-01-01',
    planId: 'basic',
    role: UserRole.patient,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tokenService.issueAccessToken = jest.fn().mockReturnValue('access-token');
    tokenService.issueRefreshToken = jest.fn().mockReturnValue({
      token: 'refresh-token',
      tokenHash: 'refresh-hash',
      expiresAt: new Date('2026-06-12T00:00:00Z'),
    });
    authRepository.createRefreshToken = jest.fn().mockResolvedValue(undefined);
  });

  describe('register', () => {
    it('registers a patient and issues tokens', async () => {
      authRepository.findUserByEmail = jest.fn().mockResolvedValue(null);
      hashingService.hash = jest.fn().mockResolvedValue('hashed-password');
      authRepository.findPaymentPlanByType = jest.fn().mockResolvedValue({ id: 'plan-1' });
      authRepository.createUserWithProfile = jest.fn().mockResolvedValue({
        id: 'user-1',
        email: patientRegisterDto.email,
        role: UserRole.patient,
        patientProfile: { name: 'New Patient' },
        doctorProfile: null,
      });

      const result = await service.register(patientRegisterDto);

      expect(hashingService.hash).toHaveBeenCalledWith('password123');
      expect(result.response.accessToken).toBe('access-token');
      expect(result.response.user.role).toBe(UserRole.patient);
      expect(result.refreshToken).toBe('refresh-token');
      expect(authRepository.createRefreshToken).toHaveBeenCalled();
    });

    it('rejects admin self-registration', async () => {
      await expect(
        service.register({ ...patientRegisterDto, role: UserRole.admin }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects duplicate email', async () => {
      authRepository.findUserByEmail = jest.fn().mockResolvedValue({ id: 'existing' });

      await expect(service.register(patientRegisterDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('requires CRM for doctor registration', async () => {
      authRepository.findUserByEmail = jest.fn().mockResolvedValue(null);

      await expect(
        service.register({
          ...patientRegisterDto,
          role: UserRole.doctor,
          email: 'doc@example.com',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      authRepository.findUserByEmail = jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'maria@example.com',
        passwordHash: 'hash',
        role: UserRole.patient,
      });
      hashingService.compare = jest.fn().mockResolvedValue(true);
      authRepository.findUserById = jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'maria@example.com',
        role: UserRole.patient,
        patientProfile: { name: 'Maria' },
        doctorProfile: null,
      });

      const result = await service.login({
        email: 'maria@example.com',
        password: 'password123',
      });

      expect(result.response.accessToken).toBe('access-token');
      expect(result.response.user.name).toBe('Maria');
    });

    it('rejects invalid credentials', async () => {
      authRepository.findUserByEmail = jest.fn().mockResolvedValue(null);

      await expect(
        service.login({ email: 'missing@example.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('rotates refresh token and returns new access token', async () => {
      tokenService.hashRefreshToken = jest.fn().mockReturnValue('refresh-hash');
      authRepository.findValidRefreshToken = jest.fn().mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'refresh-hash',
        expiresAt: new Date('2026-06-12T00:00:00Z'),
      });
      authRepository.deleteRefreshToken = jest.fn().mockResolvedValue(undefined);
      authRepository.findUserById = jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'maria@example.com',
        role: UserRole.patient,
        patientProfile: { name: 'Maria' },
        doctorProfile: null,
      });

      const result = await service.refresh('raw-refresh-token');

      expect(authRepository.deleteRefreshToken).toHaveBeenCalledWith('rt-1');
      expect(result.response.accessToken).toBe('access-token');
    });

    it('rejects missing refresh token', async () => {
      await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes refresh token when present', async () => {
      tokenService.hashRefreshToken = jest.fn().mockReturnValue('refresh-hash');
      authRepository.findValidRefreshToken = jest.fn().mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'refresh-hash',
        expiresAt: new Date('2026-06-12T00:00:00Z'),
      });
      authRepository.deleteRefreshToken = jest.fn().mockResolvedValue(undefined);

      await service.logout('raw-refresh-token');

      expect(authRepository.deleteRefreshToken).toHaveBeenCalledWith('rt-1');
    });
  });

  describe('deleteAccount', () => {
    it('deletes refresh tokens and user', async () => {
      authRepository.deleteRefreshTokensByUserId = jest.fn().mockResolvedValue(undefined);
      authRepository.deleteUser = jest.fn().mockResolvedValue(undefined);

      await service.deleteAccount({
        id: 'user-1',
        email: 'maria@example.com',
        role: UserRole.patient,
      });

      expect(authRepository.deleteRefreshTokensByUserId).toHaveBeenCalledWith('user-1');
      expect(authRepository.deleteUser).toHaveBeenCalledWith('user-1');
    });
  });
});
