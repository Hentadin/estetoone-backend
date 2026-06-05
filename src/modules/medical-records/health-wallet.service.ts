import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import {
  toConsultationHistoryResponse,
  toConsultationRecordResponse,
} from '../../domain/models/consultation-history.model';
import { toHealthConditionResponse } from '../../domain/models/health-condition.model';
import { toMedicationResponse } from '../../domain/models/medication.model';
import { toMedicalRecordResponse } from '../../domain/models/medical-record.model';
import { toVitalResponse, validateVitalInput } from '../../domain/models/vital.model';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateVitalDto } from './dto/create-vital.dto';
import { MedicalRecordsRepository } from './medical-records.repository';

@Injectable()
export class HealthWalletService {
  constructor(
    private readonly repository: MedicalRecordsRepository,
    private readonly auditService: AuditService,
  ) {}

  async getWallet(user: AuthenticatedUser) {
    const patientId = await this.resolvePatientId(user);
    const wallet = await this.repository.findHealthWalletByPatientId(patientId);

    if (!wallet) {
      throw new NotFoundException('Patient profile not found');
    }

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.read,
      resource: 'health_wallet',
      resourceId: patientId,
    });

    return {
      conditions: wallet.healthConditions.map(toHealthConditionResponse),
      medications: wallet.medications.map(toMedicationResponse),
      vitals: wallet.vitals.map(toVitalResponse),
      exams: wallet.medicalRecords.map(toMedicalRecordResponse),
      consultations: wallet.consultations.map(toConsultationRecordResponse),
      consultationHistory: wallet.consultations.map(toConsultationHistoryResponse),
    };
  }

  async listVitals(user: AuthenticatedUser) {
    const patientId = await this.resolvePatientId(user);
    const vitals = await this.repository.findVitalsByPatientId(patientId);

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.read,
      resource: 'vitals',
      metadata: { count: vitals.length },
    });

    return vitals.map(toVitalResponse);
  }

  async createVital(user: AuthenticatedUser, dto: CreateVitalDto) {
    const recordedAt = dto.recordedAt ? new Date(dto.recordedAt) : undefined;
    const validationErrors = validateVitalInput({
      type: dto.type,
      value: dto.value,
      unit: dto.unit,
      recordedAt,
    });

    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors);
    }

    const patientId = await this.resolvePatientId(user);
    const vital = await this.repository.createVital({
      patientId,
      type: dto.type,
      value: dto.value,
      unit: dto.unit,
      recordedAt,
    });

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.create,
      resource: 'vital',
      resourceId: vital.id,
    });

    return toVitalResponse(vital);
  }

  async listConsultations(user: AuthenticatedUser) {
    const patientId = await this.resolvePatientId(user);
    const consultations = await this.repository.findConsultationsByPatientId(patientId);

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.read,
      resource: 'consultations',
      metadata: { count: consultations.length },
    });

    return {
      records: consultations.map(toConsultationRecordResponse),
      history: consultations.map(toConsultationHistoryResponse),
    };
  }

  private async resolvePatientId(user: AuthenticatedUser): Promise<string> {
    const profile = await this.repository.findPatientProfileByUserId(user.id);

    if (!profile) {
      throw new NotFoundException('Patient profile not found');
    }

    return profile.id;
  }
}
