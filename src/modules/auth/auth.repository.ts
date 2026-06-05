import { Injectable } from '@nestjs/common';
import { PaymentPlanType, Prisma, User, UserRole } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  role: UserRole;
  planId?: string | null;
}

export interface CreatePatientProfileInput {
  userId: string;
  name: string;
  phone?: string;
  dateOfBirth: Date;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  behavioralData?: Prisma.InputJsonValue;
}

export interface CreateDoctorProfileInput {
  userId: string;
  name: string;
  crm: string;
  mainSpecialty: string;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        patientProfile: true,
        doctorProfile: true,
      },
    });
  }

  findPaymentPlanByType(type: PaymentPlanType) {
    return this.prisma.paymentPlan.findUnique({ where: { type } });
  }

  createUserWithProfile(
    userData: CreateUserInput,
    profile:
      | { type: 'patient'; data: Omit<CreatePatientProfileInput, 'userId'> }
      | { type: 'doctor'; data: Omit<CreateDoctorProfileInput, 'userId'> },
  ) {
    return this.prisma.user.create({
      data: {
        email: userData.email,
        passwordHash: userData.passwordHash,
        role: userData.role,
        planId: userData.planId,
        lgpdConsentAt: new Date(),
        patientProfile:
          profile.type === 'patient'
            ? {
                create: {
                  name: profile.data.name,
                  phone: profile.data.phone,
                  dateOfBirth: profile.data.dateOfBirth,
                  gender: profile.data.gender,
                  address: profile.data.address,
                  emergencyContact: profile.data.emergencyContact,
                  emergencyPhone: profile.data.emergencyPhone,
                  behavioralData: profile.data.behavioralData,
                },
              }
            : undefined,
        doctorProfile:
          profile.type === 'doctor'
            ? {
                create: {
                  name: profile.data.name,
                  crm: profile.data.crm,
                  mainSpecialty: profile.data.mainSpecialty,
                },
              }
            : undefined,
      },
      include: {
        patientProfile: true,
        doctorProfile: true,
      },
    });
  }

  createRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  findValidRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
      },
    });
  }

  deleteRefreshToken(id: string) {
    return this.prisma.refreshToken.delete({ where: { id } });
  }

  deleteRefreshTokensByUserId(userId: string) {
    return this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  deleteUser(userId: string) {
    return this.prisma.user.delete({ where: { id: userId } });
  }
}
