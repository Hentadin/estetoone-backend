import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuditService } from '../../src/infrastructure/audit/audit.service';
import { MedicalRecordsRepository } from '../../src/modules/medical-records/medical-records.repository';
import { MedicalRecordsService } from '../../src/modules/medical-records/medical-records.service';

describe('MedicalRecordsService', () => {
  const user = { id: 'user-1', email: 'patient@example.com', role: UserRole.patient };

  const record = {
    id: 'record-1',
    patientId: 'patient-1',
    title: 'Hemograma',
    summary: 'Normal',
    examType: 'laboratory',
    aiInterpretation: 'All normal',
    mimeType: 'application/pdf',
    s3Key: 'data:application/pdf;base64,abc',
    consultationId: null,
    uploadedAt: new Date('2025-05-05'),
    createdAt: new Date('2025-05-05'),
    updatedAt: new Date('2025-05-05'),
  };

  let repository: jest.Mocked<MedicalRecordsRepository>;
  let auditService: jest.Mocked<AuditService>;
  let service: MedicalRecordsService;

  beforeEach(() => {
    repository = {
      findPatientProfileByUserId: jest.fn(),
      findMedicalRecordsByPatientId: jest.fn(),
      findMedicalRecordByIdAndPatientId: jest.fn(),
      createMedicalRecord: jest.fn(),
      deleteMedicalRecord: jest.fn(),
    } as unknown as jest.Mocked<MedicalRecordsRepository>;

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditService>;

    service = new MedicalRecordsService(repository, auditService);
  });

  it('lists records scoped to authenticated patient', async () => {
    repository.findPatientProfileByUserId.mockResolvedValue({ id: 'patient-1' } as never);
    repository.findMedicalRecordsByPatientId.mockResolvedValue([record] as never);

    const result = await service.listRecords(user);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'record-1',
      name: 'Hemograma',
      type: 'laboratory',
    });
    expect(auditService.log).toHaveBeenCalled();
  });

  it('creates record with document metadata', async () => {
    repository.findPatientProfileByUserId.mockResolvedValue({ id: 'patient-1' } as never);
    repository.createMedicalRecord.mockResolvedValue(record as never);

    const result = await service.createRecord(user, {
      title: 'Hemograma',
      summary: 'Normal',
      examType: 'laboratory',
      documentData: 'data:application/pdf;base64,abc',
    });

    expect(repository.createMedicalRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'patient-1',
        s3Key: 'data:application/pdf;base64,abc',
        mimeType: 'application/pdf',
      }),
    );
    expect(result.name).toBe('Hemograma');
  });

  it('rejects invalid record payload', async () => {
    repository.findPatientProfileByUserId.mockResolvedValue({ id: 'patient-1' } as never);

    await expect(
      service.createRecord(user, {
        title: '',
        examType: 'invalid',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when record is not found for patient', async () => {
    repository.findPatientProfileByUserId.mockResolvedValue({ id: 'patient-1' } as never);
    repository.findMedicalRecordByIdAndPatientId.mockResolvedValue(null);

    await expect(service.getRecord(user, 'missing')).rejects.toThrow(NotFoundException);
  });

  it('deletes record scoped to patient', async () => {
    repository.findPatientProfileByUserId.mockResolvedValue({ id: 'patient-1' } as never);
    repository.findMedicalRecordByIdAndPatientId.mockResolvedValue(record as never);
    repository.deleteMedicalRecord.mockResolvedValue({ count: 1 } as never);

    const result = await service.deleteRecord(user, 'record-1');

    expect(result).toEqual({ deleted: true });
    expect(repository.deleteMedicalRecord).toHaveBeenCalledWith('record-1', 'patient-1');
  });
});
