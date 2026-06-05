import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import {
  extractMimeTypeFromDocumentData,
  toMedicalRecordDetailResponse,
  toMedicalRecordResponse,
  validateMedicalRecordInput,
} from '../../domain/models/medical-record.model';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { MedicalRecordsRepository } from './medical-records.repository';

@Injectable()
export class MedicalRecordsService {
  constructor(
    private readonly repository: MedicalRecordsRepository,
    private readonly auditService: AuditService,
  ) {}

  async listRecords(user: AuthenticatedUser) {
    const patientId = await this.resolvePatientId(user);

    const records = await this.repository.findMedicalRecordsByPatientId(patientId);

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.read,
      resource: 'medical_records',
      metadata: { count: records.length },
    });

    return records.map(toMedicalRecordResponse);
  }

  async getRecord(user: AuthenticatedUser, recordId: string) {
    const patientId = await this.resolvePatientId(user);
    const record = await this.repository.findMedicalRecordByIdAndPatientId(recordId, patientId);

    if (!record) {
      throw new NotFoundException('Medical record not found');
    }

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.read,
      resource: 'medical_record',
      resourceId: record.id,
    });

    return toMedicalRecordDetailResponse(record);
  }

  async createRecord(user: AuthenticatedUser, dto: CreateMedicalRecordDto) {
    const validationErrors = validateMedicalRecordInput(dto);
    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors);
    }

    const patientId = await this.resolvePatientId(user);
    const mimeType = dto.mimeType ?? extractMimeTypeFromDocumentData(dto.documentData ?? '');

    const record = await this.repository.createMedicalRecord({
      patientId,
      title: dto.title,
      summary: dto.summary,
      examType: dto.examType,
      aiInterpretation: dto.aiInterpretation,
      s3Key: dto.documentData,
      mimeType,
      consultationId: dto.consultationId,
    });

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.create,
      resource: 'medical_record',
      resourceId: record.id,
    });

    return toMedicalRecordDetailResponse(record);
  }

  async deleteRecord(user: AuthenticatedUser, recordId: string) {
    const patientId = await this.resolvePatientId(user);
    const existing = await this.repository.findMedicalRecordByIdAndPatientId(recordId, patientId);

    if (!existing) {
      throw new NotFoundException('Medical record not found');
    }

    await this.repository.deleteMedicalRecord(recordId, patientId);

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.delete,
      resource: 'medical_record',
      resourceId: recordId,
    });

    return { deleted: true };
  }

  private async resolvePatientId(user: AuthenticatedUser): Promise<string> {
    const profile = await this.repository.findPatientProfileByUserId(user.id);

    if (!profile) {
      throw new NotFoundException('Patient profile not found');
    }

    return profile.id;
  }
}
