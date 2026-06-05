import { Injectable } from '@nestjs/common';
import {
  ConsultationStatus,
  ConsultationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface CreateConsultationData {
  patientId: string;
  doctorId: string;
  type: ConsultationType;
  status?: ConsultationStatus;
  scheduledAt?: Date;
  cost?: number;
}

@Injectable()
export class ConsultationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPatientProfileByUserId(userId: string) {
    return this.prisma.patientProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
  }

  findDoctorProfileByUserId(userId: string) {
    return this.prisma.doctorProfile.findUnique({
      where: { userId },
      select: { id: true, isOnline: true, consultationFee: true },
    });
  }

  findDoctorById(id: string) {
    return this.prisma.doctorProfile.findUnique({
      where: { id },
      select: {
        id: true,
        isOnline: true,
        consultationFee: true,
        mainSpecialty: true,
      },
    });
  }

  findFirstOnlineDoctor(specialty?: string) {
    const where: Prisma.DoctorProfileWhereInput = { isOnline: true };

    if (specialty) {
      where.mainSpecialty = { contains: specialty, mode: 'insensitive' };
    }

    return this.prisma.doctorProfile.findFirst({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        consultationFee: true,
      },
    });
  }

  createConsultation(data: CreateConsultationData) {
    return this.prisma.consultation.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        type: data.type,
        status: data.status ?? ConsultationStatus.waiting,
        scheduledAt: data.scheduledAt,
        cost: data.cost,
      },
      include: {
        doctor: { select: { id: true, name: true, mainSpecialty: true } },
        patient: { select: { id: true, name: true } },
      },
    });
  }

  findById(id: string) {
    return this.prisma.consultation.findUnique({
      where: { id },
      include: {
        doctor: { select: { id: true, name: true, mainSpecialty: true } },
        patient: { select: { id: true, name: true } },
      },
    });
  }

  findByPatientId(patientId: string) {
    return this.prisma.consultation.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        doctor: { select: { id: true, name: true, mainSpecialty: true } },
        patient: { select: { id: true, name: true } },
      },
    });
  }

  findHistoryByPatientId(patientId: string) {
    return this.prisma.consultation.findMany({
      where: {
        patientId,
        status: { in: [ConsultationStatus.completed, ConsultationStatus.cancelled] },
      },
      orderBy: { endedAt: 'desc' },
      include: {
        doctor: { select: { id: true, name: true, mainSpecialty: true } },
        patient: { select: { id: true, name: true } },
      },
    });
  }

  findByDoctorId(doctorId: string) {
    return this.prisma.consultation.findMany({
      where: { doctorId },
      orderBy: { createdAt: 'desc' },
      include: {
        doctor: { select: { id: true, name: true, mainSpecialty: true } },
        patient: { select: { id: true, name: true } },
      },
    });
  }

  updateStatus(
    id: string,
    status: ConsultationStatus,
    timestamps: {
      startedAt?: Date;
      endedAt?: Date;
      duration?: number;
      roomUrl?: string;
    },
  ) {
    return this.prisma.consultation.update({
      where: { id },
      data: {
        status,
        ...timestamps,
      },
      include: {
        doctor: { select: { id: true, name: true, mainSpecialty: true } },
        patient: { select: { id: true, name: true } },
      },
    });
  }

  updateRoomUrl(id: string, roomUrl: string) {
    return this.prisma.consultation.update({
      where: { id },
      data: { roomUrl },
      include: {
        doctor: { select: { id: true, name: true, mainSpecialty: true } },
        patient: { select: { id: true, name: true } },
      },
    });
  }
}
