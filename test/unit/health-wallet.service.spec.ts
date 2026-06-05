import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole, VitalType } from '@prisma/client';
import { AuditService } from '../../src/infrastructure/audit/audit.service';
import { HealthWalletService } from '../../src/modules/medical-records/health-wallet.service';
import { MedicalRecordsRepository } from '../../src/modules/medical-records/medical-records.repository';

describe('HealthWalletService', () => {
  const user = { id: 'user-1', email: 'patient@example.com', role: UserRole.patient };

  const wallet = {
    id: 'patient-1',
    healthConditions: [
      {
        id: 'cond-1',
        name: 'Hypertension',
        classification: 'ACC/AHA',
        score: 'Stage 1',
        severity: 'controlled',
        icon: 'activity',
        lastAssessed: new Date('2025-05-02'),
        treatment: 'Lisinopril',
      },
    ],
    medications: [
      {
        id: 'med-1',
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'Twice daily',
        instructions: 'With meals',
        nextDose: '8:00 AM',
        refillBy: null,
        quantityRemaining: 12,
        presentation: 'Oral tablet',
      },
    ],
    vitals: [
      {
        id: 'vital-1',
        type: VitalType.blood_pressure,
        value: '128/82',
        unit: 'mmHg',
        recordedAt: new Date('2025-05-02'),
      },
    ],
    medicalRecords: [
      {
        id: 'record-1',
        title: 'Hemograma',
        summary: 'Normal',
        examType: 'laboratory',
        aiInterpretation: 'All normal',
        mimeType: 'application/pdf',
        uploadedAt: new Date('2025-05-05'),
      },
    ],
    consultations: [
      {
        id: 'consult-1',
        status: 'completed',
        scheduledAt: new Date('2025-04-15'),
        startedAt: new Date('2025-04-15'),
        endedAt: new Date('2025-04-15'),
        duration: 30,
        cost: { toNumber: () => 150 },
        doctor: { name: 'Dr. Carlos', mainSpecialty: 'Cardiology' },
        medicalRecords: [{ summary: 'Annual checkup completed.' }],
      },
    ],
  };

  let repository: jest.Mocked<MedicalRecordsRepository>;
  let auditService: jest.Mocked<AuditService>;
  let service: HealthWalletService;

  beforeEach(() => {
    repository = {
      findPatientProfileByUserId: jest.fn(),
      findHealthWalletByPatientId: jest.fn(),
      findVitalsByPatientId: jest.fn(),
      createVital: jest.fn(),
      findConsultationsByPatientId: jest.fn(),
    } as unknown as jest.Mocked<MedicalRecordsRepository>;

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditService>;

    service = new HealthWalletService(repository, auditService);
  });

  it('returns aggregated health wallet data', async () => {
    repository.findPatientProfileByUserId.mockResolvedValue({ id: 'patient-1' } as never);
    repository.findHealthWalletByPatientId.mockResolvedValue(wallet as never);

    const result = await service.getWallet(user);

    expect(result.conditions).toHaveLength(1);
    expect(result.medications).toHaveLength(1);
    expect(result.vitals).toHaveLength(1);
    expect(result.exams).toHaveLength(1);
    expect(result.consultations).toHaveLength(1);
    expect(result.consultationHistory).toHaveLength(1);
    expect(auditService.log).toHaveBeenCalled();
  });

  it('creates vital for authenticated patient', async () => {
    repository.findPatientProfileByUserId.mockResolvedValue({ id: 'patient-1' } as never);
    repository.createVital.mockResolvedValue({
      id: 'vital-2',
      type: VitalType.heart_rate,
      value: '72',
      unit: 'bpm',
      recordedAt: new Date('2025-05-10'),
    } as never);

    const result = await service.createVital(user, {
      type: VitalType.heart_rate,
      value: '72',
      unit: 'bpm',
    });

    expect(result.value).toBe('72');
    expect(repository.createVital).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'patient-1', value: '72' }),
    );
  });

  it('rejects invalid vital payload', async () => {
    repository.findPatientProfileByUserId.mockResolvedValue({ id: 'patient-1' } as never);

    await expect(
      service.createVital(user, {
        type: VitalType.glucose,
        value: '',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when patient profile is missing', async () => {
    repository.findPatientProfileByUserId.mockResolvedValue(null);

    await expect(service.getWallet(user)).rejects.toThrow(NotFoundException);
  });
});
