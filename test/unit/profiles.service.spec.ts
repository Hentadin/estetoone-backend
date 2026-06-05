import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ProfilesRepository } from '../../src/modules/profiles/profiles.repository';
import { ProfilesService } from '../../src/modules/profiles/profiles.service';

describe('ProfilesService', () => {
  const user = { id: 'user-1', email: 'patient@example.com', role: UserRole.patient };
  const doctorUser = { id: 'user-2', email: 'doctor@example.com', role: UserRole.doctor };

  const patientProfile = {
    name: 'Maria Silva',
    phone: '+55 11 99999-0001',
    dateOfBirth: new Date('1985-03-15'),
    gender: 'female',
    address: 'São Paulo, SP',
    medicalHistory: 'Hypertension',
    allergies: 'Penicillin',
    emergencyContact: 'João Silva',
    emergencyPhone: '+55 11 99999-0002',
    bloodType: 'O+',
    height: '165cm',
    weight: '68kg',
    profilePhotoUrl: null,
    healthConditions: [],
    medications: [],
  };

  const doctorProfile = {
    name: 'Dr. Carlos',
    crm: 'CRM/SP 123456',
    rqe: '12345',
    mainSpecialty: 'Cardiologia',
    bio: 'Experienced cardiologist',
    profilePhotoUrl: null,
    isOnline: false,
    consultationFee: { toNumber: () => 150 },
    availability: { monday: ['09:00', '17:00'] },
  };

  let repository: jest.Mocked<ProfilesRepository>;
  let service: ProfilesService;

  beforeEach(() => {
    repository = {
      findPatientProfileByUserId: jest.fn(),
      findDoctorProfileByUserId: jest.fn(),
      updatePatientProfile: jest.fn(),
      updateDoctorProfile: jest.fn(),
      updatePatientPhoto: jest.fn(),
      updateDoctorPhoto: jest.fn(),
    } as unknown as jest.Mocked<ProfilesRepository>;

    service = new ProfilesService(repository);
  });

  describe('getPatientProfile', () => {
    it('returns mapped patient profile', async () => {
      repository.findPatientProfileByUserId.mockResolvedValue(patientProfile as never);

      const result = await service.getPatientProfile(user);

      expect(result).toMatchObject({
        name: 'Maria Silva',
        dateOfBirth: '1985-03-15',
        bloodType: 'O+',
      });
    });

    it('throws when profile is missing', async () => {
      repository.findPatientProfileByUserId.mockResolvedValue(null);

      await expect(service.getPatientProfile(user)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePatientProfile', () => {
    it('updates profile with valid data', async () => {
      repository.findPatientProfileByUserId.mockResolvedValue(patientProfile as never);
      repository.updatePatientProfile.mockResolvedValue({
        ...patientProfile,
        phone: '+55 11 88888-0000',
      } as never);

      const result = await service.updatePatientProfile(user, {
        phone: '+55 11 88888-0000',
      });

      expect(repository.updatePatientProfile).toHaveBeenCalledWith('user-1', {
        phone: '+55 11 88888-0000',
        dateOfBirth: undefined,
      });
      expect(result.phone).toBe('+55 11 88888-0000');
    });

    it('rejects invalid blood type', async () => {
      repository.findPatientProfileByUserId.mockResolvedValue(patientProfile as never);

      await expect(
        service.updatePatientProfile(user, { bloodType: 'INVALID' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadPatientPhoto', () => {
    it('stores valid data URL', async () => {
      repository.findPatientProfileByUserId.mockResolvedValue(patientProfile as never);
      repository.updatePatientPhoto.mockResolvedValue({
        ...patientProfile,
        profilePhotoUrl: 'data:image/png;base64,abc',
      } as never);

      const result = await service.uploadPatientPhoto(user, {
        profilePhotoUrl: 'data:image/png;base64,abc',
      });

      expect(result.profilePhotoUrl).toBe('data:image/png;base64,abc');
    });

    it('rejects invalid photo URL', async () => {
      repository.findPatientProfileByUserId.mockResolvedValue(patientProfile as never);

      await expect(
        service.uploadPatientPhoto(user, { profilePhotoUrl: 'not-a-url' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getDoctorProfile', () => {
    it('returns mapped doctor profile', async () => {
      repository.findDoctorProfileByUserId.mockResolvedValue(doctorProfile as never);

      const result = await service.getDoctorProfile(doctorUser);

      expect(result).toMatchObject({
        name: 'Dr. Carlos',
        crm: 'CRM/SP 123456',
        mainSpecialty: 'Cardiologia',
        consultationFee: 150,
      });
    });
  });

  describe('updateDoctorProfile', () => {
    it('updates doctor profile', async () => {
      repository.findDoctorProfileByUserId.mockResolvedValue(doctorProfile as never);
      repository.updateDoctorProfile.mockResolvedValue({
        ...doctorProfile,
        isOnline: true,
      } as never);

      const result = await service.updateDoctorProfile(doctorUser, { isOnline: true });

      expect(result.isOnline).toBe(true);
    });

    it('rejects negative consultation fee', async () => {
      repository.findDoctorProfileByUserId.mockResolvedValue(doctorProfile as never);

      await expect(
        service.updateDoctorProfile(doctorUser, { consultationFee: -10 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
