import {
  validateDoctorProfileUpdate,
  toDoctorProfileResponse,
} from '../../src/domain/models/doctor-profile.model';
import {
  validatePatientProfileUpdate,
  validateProfilePhotoUrl,
  toPatientProfileResponse,
} from '../../src/domain/models/patient-profile.model';

describe('PatientProfile model', () => {
  it('validates blood type and dateOfBirth', () => {
    const errors = validatePatientProfileUpdate({
      name: '',
      dateOfBirth: 'invalid-date',
      bloodType: 'X+',
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'name must not be empty',
        'dateOfBirth must be a valid ISO date (YYYY-MM-DD)',
        'bloodType must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-',
      ]),
    );
  });

  it('accepts valid blood type', () => {
    const errors = validatePatientProfileUpdate({ bloodType: 'O+' });
    expect(errors).toEqual([]);
  });

  it('validates profile photo size for data URLs', () => {
    const largeBase64 = 'A'.repeat(7 * 1024 * 1024);
    const errors = validateProfilePhotoUrl(`data:image/png;base64,${largeBase64}`);

    expect(errors).toContain('profile photo must not exceed 5MB');
  });

  it('accepts HTTP(S) photo URLs', () => {
    const errors = validateProfilePhotoUrl('https://cdn.example.com/photo.jpg');
    expect(errors).toEqual([]);
  });

  it('maps patient profile with nested data', () => {
    const response = toPatientProfileResponse({
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
      profilePhotoUrl: 'https://cdn.example.com/photo.jpg',
      healthConditions: [],
      medications: [],
    });

    expect(response).toMatchObject({
      name: 'Maria Silva',
      dateOfBirth: '1985-03-15',
      profilePhotoUrl: 'https://cdn.example.com/photo.jpg',
    });
  });
});

describe('DoctorProfile model', () => {
  it('validates required string fields when provided', () => {
    const errors = validateDoctorProfileUpdate({
      name: '',
      crm: '',
      mainSpecialty: '',
      consultationFee: -1,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'name must not be empty',
        'crm must not be empty',
        'mainSpecialty must not be empty',
        'consultationFee must be a non-negative number',
      ]),
    );
  });

  it('maps doctor profile response', () => {
    const response = toDoctorProfileResponse({
      name: 'Dr. Carlos',
      crm: 'CRM/SP 123456',
      rqe: '12345',
      mainSpecialty: 'Cardiologia',
      bio: 'Experienced cardiologist',
      profilePhotoUrl: null,
      isOnline: true,
      consultationFee: { toNumber: () => 150.5 },
      availability: { monday: ['09:00'] },
    });

    expect(response).toMatchObject({
      name: 'Dr. Carlos',
      mainSpecialty: 'Cardiologia',
      consultationFee: 150.5,
      isOnline: true,
    });
  });
});
