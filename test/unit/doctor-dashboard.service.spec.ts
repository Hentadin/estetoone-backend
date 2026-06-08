import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuditService } from '../../src/infrastructure/audit/audit.service';
import { DoctorDashboardRepository } from '../../src/modules/doctor-dashboard/doctor-dashboard.repository';
import { DoctorDashboardService } from '../../src/modules/doctor-dashboard/doctor-dashboard.service';

describe('DoctorDashboardService', () => {
  const doctorUser = { id: 'user-1', email: 'doctor@example.com', role: UserRole.doctor };

  const doctorProfile = {
    id: 'doctor-1',
    userId: 'user-1',
    name: 'Dr. Carlos',
    isOnline: false,
  };

  let repository: jest.Mocked<DoctorDashboardRepository>;
  let auditService: jest.Mocked<AuditService>;
  let service: DoctorDashboardService;

  beforeEach(() => {
    repository = {
      findDoctorProfileByUserId: jest.fn(),
      findPatientById: jest.fn(),
      findDistinctPatientsByDoctorId: jest.fn(),
      findTodayAppointments: jest.fn(),
      createPatientLinkConsultation: jest.fn(),
      updateOnlineStatus: jest.fn(),
      hasExistingConsultation: jest.fn(),
    } as unknown as jest.Mocked<DoctorDashboardRepository>;

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditService>;

    service = new DoctorDashboardService(repository, auditService);
  });

  it('lists patients linked to doctor', async () => {
    repository.findDoctorProfileByUserId.mockResolvedValue(doctorProfile as never);
    repository.findDistinctPatientsByDoctorId.mockResolvedValue([
      {
        patient: {
          id: 'patient-1',
          name: 'Maria',
          phone: '+55 11 99999-0001',
          dateOfBirth: new Date('1990-01-01'),
          profilePhotoUrl: null,
        },
        createdAt: new Date('2026-06-01'),
      },
    ] as never);

    const result = await service.listPatients(doctorUser);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'patient-1', name: 'Maria' });
  });

  it('adds patient when not already linked', async () => {
    repository.findDoctorProfileByUserId.mockResolvedValue(doctorProfile as never);
    repository.findPatientById.mockResolvedValue({
      id: 'patient-1',
      name: 'Maria',
      phone: null,
      dateOfBirth: new Date('1990-01-01'),
      profilePhotoUrl: null,
    } as never);
    repository.hasExistingConsultation.mockResolvedValue(null);
    repository.createPatientLinkConsultation.mockResolvedValue({} as never);

    const result = await service.addPatient(doctorUser, { patientId: 'patient-1' });

    expect(result.name).toBe('Maria');
    expect(repository.createPatientLinkConsultation).toHaveBeenCalledWith(
      'doctor-1',
      'patient-1',
    );
  });

  it('rejects duplicate patient link', async () => {
    repository.findDoctorProfileByUserId.mockResolvedValue(doctorProfile as never);
    repository.findPatientById.mockResolvedValue({
      id: 'patient-1',
      name: 'Maria',
      phone: null,
      dateOfBirth: new Date('1990-01-01'),
      profilePhotoUrl: null,
    } as never);
    repository.hasExistingConsultation.mockResolvedValue({ id: 'existing' } as never);

    await expect(
      service.addPatient(doctorUser, { patientId: 'patient-1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates online status', async () => {
    repository.findDoctorProfileByUserId.mockResolvedValue(doctorProfile as never);
    repository.updateOnlineStatus.mockResolvedValue({
      ...doctorProfile,
      isOnline: true,
    } as never);

    const result = await service.updateOnlineStatus(doctorUser, { isOnline: true });

    expect(result.isOnline).toBe(true);
  });

  it('throws when doctor profile missing', async () => {
    repository.findDoctorProfileByUserId.mockResolvedValue(null);

    await expect(service.listPatients(doctorUser)).rejects.toThrow(NotFoundException);
  });
});
