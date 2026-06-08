import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConsultationStatus, ConsultationType, UserRole } from '@prisma/client';
import { AuditService } from '../../src/infrastructure/audit/audit.service';
import { RedisService } from '../../src/infrastructure/redis/redis.service';
import { ConsultationsRepository } from '../../src/modules/consultations/consultations.repository';
import { ConsultationsService } from '../../src/modules/consultations/consultations.service';

describe('ConsultationsService', () => {
  const patientUser = { id: 'user-1', email: 'patient@example.com', role: UserRole.patient };
  const doctorUser = { id: 'user-2', email: 'doctor@example.com', role: UserRole.doctor };

  const consultation = {
    id: 'consult-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    type: ConsultationType.SCHEDULED,
    status: ConsultationStatus.waiting,
    scheduledAt: new Date('2026-06-10T10:00:00.000Z'),
    startedAt: null,
    endedAt: null,
    duration: null,
    cost: { toNumber: () => 150 },
    roomUrl: null,
    doctor: { id: 'doctor-1', name: 'Dr. Carlos', mainSpecialty: 'Cardiologia' },
    patient: { id: 'patient-1', name: 'Maria' },
  };

  let repository: jest.Mocked<ConsultationsRepository>;
  let auditService: jest.Mocked<AuditService>;
  let redisService: jest.Mocked<RedisService>;
  let redisClient: { lpush: jest.Mock; rpop: jest.Mock };
  let service: ConsultationsService;

  beforeEach(() => {
    repository = {
      findPatientProfileByUserId: jest.fn(),
      findDoctorProfileByUserId: jest.fn(),
      findDoctorById: jest.fn(),
      findFirstOnlineDoctor: jest.fn(),
      createConsultation: jest.fn(),
      findById: jest.fn(),
      findByPatientId: jest.fn(),
      findHistoryByPatientId: jest.fn(),
      findByDoctorId: jest.fn(),
      updateStatus: jest.fn(),
      updateRoomUrl: jest.fn(),
    } as unknown as jest.Mocked<ConsultationsRepository>;

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditService>;

    redisClient = {
      lpush: jest.fn().mockResolvedValue(1),
      rpop: jest.fn().mockResolvedValue(null),
    };

    redisService = {
      getClient: jest.fn().mockReturnValue(redisClient),
    } as unknown as jest.Mocked<RedisService>;

    service = new ConsultationsService(repository, auditService, redisService);
  });

  describe('scheduleConsultation', () => {
    it('creates scheduled consultation', async () => {
      repository.findPatientProfileByUserId.mockResolvedValue({ id: 'patient-1' } as never);
      repository.findDoctorById.mockResolvedValue({
        id: 'doctor-1',
        isOnline: true,
        consultationFee: { toNumber: () => 150 },
        mainSpecialty: 'Cardiologia',
      } as never);
      repository.createConsultation.mockResolvedValue(consultation as never);

      const future = new Date(Date.now() + 86400000).toISOString();
      const result = await service.scheduleConsultation(patientUser, {
        doctorId: 'doctor-1',
        scheduledAt: future,
      });

      expect(result.id).toBe('consult-1');
      expect(repository.createConsultation).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
    });

    it('rejects invalid schedule date', async () => {
      await expect(
        service.scheduleConsultation(patientUser, {
          doctorId: 'doctor-1',
          scheduledAt: 'invalid',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('requestInstantConsultation', () => {
    it('matches online doctor immediately', async () => {
      repository.findPatientProfileByUserId.mockResolvedValue({ id: 'patient-1' } as never);
      repository.findFirstOnlineDoctor.mockResolvedValue({
        id: 'doctor-1',
        consultationFee: { toNumber: () => 150 },
      } as never);
      repository.createConsultation.mockResolvedValue({
        ...consultation,
        type: ConsultationType.INSTANT,
      } as never);

      const result = await service.requestInstantConsultation(patientUser, {});

      expect(result.matched).toBe(true);
      expect(result.consultation?.type).toBe(ConsultationType.INSTANT);
    });

    it('queues patient when no doctor online', async () => {
      repository.findPatientProfileByUserId.mockResolvedValue({ id: 'patient-1' } as never);
      repository.findFirstOnlineDoctor.mockResolvedValue(null);

      const result = await service.requestInstantConsultation(patientUser, {
        specialty: 'Cardiologia',
      });

      expect(result.matched).toBe(false);
      expect(result.queued).toBe(true);
      expect(redisClient.lpush).toHaveBeenCalled();
    });
  });

  describe('updateConsultationStatus', () => {
    it('transitions waiting to active with mock room url', async () => {
      repository.findById.mockResolvedValue(consultation as never);
      repository.findPatientProfileByUserId.mockResolvedValue({ id: 'patient-1' } as never);
      repository.updateStatus.mockResolvedValue({
        ...consultation,
        status: ConsultationStatus.active,
        startedAt: new Date(),
        roomUrl: 'https://mock.daily.co/room-consult-1',
      } as never);

      const result = await service.updateConsultationStatus(
        patientUser,
        'consult-1',
        { status: ConsultationStatus.active },
      );

      expect(result.status).toBe(ConsultationStatus.active);
      expect(result.roomUrl).toContain('mock.daily.co');
    });

    it('throws when consultation not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateConsultationStatus(patientUser, 'missing', {
          status: ConsultationStatus.active,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('matchInstantConsultation', () => {
    it('requires doctor to be online', async () => {
      repository.findDoctorProfileByUserId.mockResolvedValue({
        id: 'doctor-1',
        isOnline: false,
        consultationFee: { toNumber: () => 150 },
      } as never);

      await expect(service.matchInstantConsultation(doctorUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
