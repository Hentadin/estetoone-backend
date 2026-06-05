import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface UpdatePatientProfileData {
  name?: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  medicalHistory?: string;
  allergies?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  bloodType?: string;
  height?: string;
  weight?: string;
  profilePhotoUrl?: string | null;
}

export interface UpdateDoctorProfileData {
  name?: string;
  crm?: string;
  rqe?: string | null;
  mainSpecialty?: string;
  bio?: string | null;
  profilePhotoUrl?: string | null;
  isOnline?: boolean;
  consultationFee?: number | null;
  availability?: unknown;
}

@Injectable()
export class ProfilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPatientProfileByUserId(userId: string) {
    return this.prisma.patientProfile.findUnique({
      where: { userId },
      include: {
        healthConditions: true,
        medications: true,
      },
    });
  }

  findDoctorProfileByUserId(userId: string) {
    return this.prisma.doctorProfile.findUnique({
      where: { userId },
    });
  }

  updatePatientProfile(userId: string, data: UpdatePatientProfileData) {
    return this.prisma.patientProfile.update({
      where: { userId },
      data,
      include: {
        healthConditions: true,
        medications: true,
      },
    });
  }

  updateDoctorProfile(userId: string, data: UpdateDoctorProfileData) {
    const { availability, consultationFee, ...rest } = data;

    return this.prisma.doctorProfile.update({
      where: { userId },
      data: {
        ...rest,
        ...(consultationFee !== undefined ? { consultationFee } : {}),
        ...(availability !== undefined
          ? {
              availability:
                availability === null
                  ? Prisma.JsonNull
                  : (availability as Prisma.InputJsonValue),
            }
          : {}),
      },
    });
  }

  updatePatientPhoto(userId: string, profilePhotoUrl: string | null) {
    return this.prisma.patientProfile.update({
      where: { userId },
      data: { profilePhotoUrl },
      include: {
        healthConditions: true,
        medications: true,
      },
    });
  }

  updateDoctorPhoto(userId: string, profilePhotoUrl: string | null) {
    return this.prisma.doctorProfile.update({
      where: { userId },
      data: { profilePhotoUrl },
    });
  }
}
