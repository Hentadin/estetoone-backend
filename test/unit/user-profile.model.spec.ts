import { UserRole } from '@prisma/client';
import {
  toUserDataResponse,
  validateUserProfile,
} from '../../src/domain/models/user-profile.model';

describe('UserProfile model', () => {
  it('validates email, name, dateOfBirth and role', () => {
    const errors = validateUserProfile({
      email: 'invalid-email',
      name: '',
      dateOfBirth: new Date('invalid'),
      role: 'invalid' as UserRole,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'email must be a valid email address',
        'name is required',
        'dateOfBirth must be a valid date',
        'role must be patient, doctor, or admin',
      ]),
    );
  });

  it('maps patient profile to AuthContext UserData shape', () => {
    const response = toUserDataResponse({
      id: 'user-1',
      email: 'maria.silva@example.com',
      role: UserRole.patient,
      patientProfile: {
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
      },
    });

    expect(response).toMatchObject({
      id: 'user-1',
      name: 'Maria Silva',
      email: 'maria.silva@example.com',
      phone: '+55 11 99999-0001',
      dateOfBirth: '1985-03-15',
      gender: 'female',
      address: 'São Paulo, SP',
      medicalHistory: 'Hypertension',
      allergies: 'Penicillin',
      emergencyContact: 'João Silva',
      emergencyPhone: '+55 11 99999-0002',
      bloodType: 'O+',
      height: '165cm',
      weight: '68kg',
    });
  });
});
