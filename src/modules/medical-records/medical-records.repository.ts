import { Injectable } from '@nestjs/common';
import { VitalType } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface CreateMedicalRecordData {
  patientId: string;
  title: string;
  summary?: string;
  examType?: string;
  aiInterpretation?: string;
  s3Key?: string;
  mimeType?: string;
  consultationId?: string;
}

export interface CreateVitalData {
  patientId: string;
  type: VitalType;
  value: string;
  unit?: string;
  recordedAt?: Date;
}

@Injectable()
export class MedicalRecordsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPatientProfileByUserId(userId: string) {
    return this.prisma.patientProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
  }

  findHealthWalletByPatientId(patientId: string) {
    return this.prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: {
        healthConditions: { orderBy: { lastAssessed: 'desc' } },
        medications: { orderBy: { createdAt: 'desc' } },
        vitals: { orderBy: { recordedAt: 'desc' }, take: 20 },
        medicalRecords: { orderBy: { uploadedAt: 'desc' } },
        consultations: {
          orderBy: { scheduledAt: 'desc' },
          include: {
            doctor: {
              select: { name: true, mainSpecialty: true },
            },
            medicalRecords: {
              select: { summary: true },
              take: 1,
            },
          },
        },
      },
    });
  }

  findMedicalRecordsByPatientId(patientId: string) {
    return this.prisma.medicalRecord.findMany({
      where: { patientId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  findMedicalRecordByIdAndPatientId(id: string, patientId: string) {
    return this.prisma.medicalRecord.findFirst({
      where: { id, patientId },
    });
  }

  createMedicalRecord(data: CreateMedicalRecordData) {
    return this.prisma.medicalRecord.create({ data });
  }

  deleteMedicalRecord(id: string, patientId: string) {
    return this.prisma.medicalRecord.deleteMany({
      where: { id, patientId },
    });
  }

  findVitalsByPatientId(patientId: string) {
    return this.prisma.vital.findMany({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  createVital(data: CreateVitalData) {
    return this.prisma.vital.create({ data });
  }

  findConsultationsByPatientId(patientId: string) {
    return this.prisma.consultation.findMany({
      where: { patientId },
      orderBy: { scheduledAt: 'desc' },
      include: {
        doctor: {
          select: { name: true, mainSpecialty: true },
        },
        medicalRecords: {
          select: { summary: true },
          take: 1,
        },
      },
    });
  }
}
