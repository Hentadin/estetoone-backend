import { UserRole } from '@prisma/client';

export interface UserProfileInput {
  email: string;
  name: string;
  phone?: string;
  dateOfBirth: Date;
  gender?: string;
  address?: string;
  role: UserRole;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateUserProfile(input: UserProfileInput): string[] {
  const errors: string[] = [];

  if (!input.email?.trim() || !EMAIL_REGEX.test(input.email)) {
    errors.push('email must be a valid email address');
  }
  if (!input.name?.trim()) {
    errors.push('name is required');
  }
  if (!(input.dateOfBirth instanceof Date) || Number.isNaN(input.dateOfBirth.getTime())) {
    errors.push('dateOfBirth must be a valid date');
  }
  if (!Object.values(UserRole).includes(input.role)) {
    errors.push('role must be patient, doctor, or admin');
  }

  return errors;
}

export function toUserDataResponse(user: {
  id: string;
  email: string;
  role: UserRole;
  patientProfile?: {
    name: string;
    phone: string | null;
    dateOfBirth: Date;
    gender: string | null;
    address: string | null;
    medicalHistory: string | null;
    allergies: string | null;
    emergencyContact: string | null;
    emergencyPhone: string | null;
    bloodType: string | null;
    height: string | null;
    weight: string | null;
    profilePhotoUrl: string | null;
  } | null;
}) {
  const profile = user.patientProfile;
  if (!profile) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  return {
    id: user.id,
    name: profile.name,
    email: user.email,
    phone: profile.phone ?? '',
    dateOfBirth: profile.dateOfBirth.toISOString().split('T')[0],
    gender: profile.gender ?? '',
    address: profile.address ?? '',
    medicalHistory: profile.medicalHistory ?? '',
    allergies: profile.allergies ?? '',
    medications: '',
    emergencyContact: profile.emergencyContact ?? '',
    emergencyPhone: profile.emergencyPhone ?? '',
    bloodType: profile.bloodType ?? '',
    height: profile.height ?? '',
    weight: profile.weight ?? '',
    profilePhoto: profile.profilePhotoUrl ?? undefined,
  };
}
