import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DoctorsRepository } from '../../src/modules/doctors/doctors.repository';
import { DoctorsService } from '../../src/modules/doctors/doctors.service';

describe('DoctorsService', () => {
  const doctorUser = { id: 'user-1', email: 'doctor@example.com', role: UserRole.doctor };

  const doctorProfile = {
    id: 'doctor-1',
    name: 'Dr. Carlos',
    crm: 'CRM/SP 123456',
    rqe: null,
    mainSpecialty: 'Cardiologia',
    bio: 'Experienced',
    profilePhotoUrl: null,
    isOnline: true,
    consultationFee: { toNumber: () => 150 },
    availability: { monday: ['09:00'] },
  };

  let repository: jest.Mocked<DoctorsRepository>;
  let service: DoctorsService;

  beforeEach(() => {
    repository = {
      findMany: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      findDoctorProfileByUserId: jest.fn(),
      updateAvailability: jest.fn(),
      patchAvailability: jest.fn(),
    } as unknown as jest.Mocked<DoctorsRepository>;

    service = new DoctorsService(repository);
  });

  it('lists doctors with pagination meta', async () => {
    repository.findMany.mockResolvedValue([doctorProfile] as never);
    repository.count.mockResolvedValue(1);

    const result = await service.listDoctors({ page: 1, limit: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: 'doctor-1',
      name: 'Dr. Carlos',
      isOnline: true,
    });
    expect(result.meta).toEqual({ page: 1, limit: 10, total: 1 });
  });

  it('throws when doctor not found by id', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getDoctorById('missing')).rejects.toThrow(NotFoundException);
  });

  it('replaces doctor availability', async () => {
    repository.findDoctorProfileByUserId.mockResolvedValue(doctorProfile as never);
    repository.updateAvailability.mockResolvedValue({
      ...doctorProfile,
      availability: { tuesday: ['14:00'] },
    } as never);

    const result = await service.replaceAvailability(doctorUser, {
      availability: { tuesday: ['14:00'] },
    });

    expect(result.availability).toEqual({ tuesday: ['14:00'] });
  });
});
