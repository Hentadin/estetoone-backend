import { Injectable } from '@nestjs/common';
import { ConsultationStatus, ConsultationType } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class DoctorDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  findDoctorProfileByUserId(userId: string) {
    return this.prisma.doctorProfile.findUnique({
      where: { userId },
    });
  }

  findPatientById(patientId: string) {
    return this.prisma.patientProfile.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        name: true,
        phone: true,
        dateOfBirth: true,
        profilePhotoUrl: true,
      },
    });
  }

  findDistinctPatientsByDoctorId(doctorId: string) {
    return this.prisma.consultation.findMany({
      where: { doctorId },
      distinct: ['patientId'],
      select: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            dateOfBirth: true,
            profilePhotoUrl: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findTodayAppointments(doctorId: string, startOfDay: Date, endOfDay: Date) {
    return this.prisma.consultation.findMany({
      where: {
        doctorId,
        type: ConsultationType.SCHEDULED,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { not: ConsultationStatus.cancelled },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        patient: {
          select: { id: true, name: true, phone: true },
        },
      },
    });
  }

  createPatientLinkConsultation(doctorId: string, patientId: string) {
    return this.prisma.consultation.create({
      data: {
        doctorId,
        patientId,
        type: ConsultationType.SCHEDULED,
        status: ConsultationStatus.waiting,
      },
    });
  }

  updateOnlineStatus(userId: string, isOnline: boolean) {
    return this.prisma.doctorProfile.update({
      where: { userId },
      data: { isOnline },
    });
  }

  hasExistingConsultation(doctorId: string, patientId: string) {
    return this.prisma.consultation.findFirst({
      where: { doctorId, patientId },
      select: { id: true },
    });
  }
}
