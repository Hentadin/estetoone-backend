import { validateProfilePhotoUrl } from './patient-profile.model';

export interface DoctorProfileUpdateInput {
  name?: string;
  crm?: string;
  rqe?: string | null;
  mainSpecialty?: string;
  bio?: string | null;
  profilePhotoUrl?: string | null;
  isOnline?: boolean;
  consultationFee?: number | null;
  availability?: Record<string, unknown> | null;
}

export function validateDoctorProfileUpdate(input: DoctorProfileUpdateInput): string[] {
  const errors: string[] = [];

  if (input.name !== undefined && !input.name.trim()) {
    errors.push('name must not be empty');
  }

  if (input.crm !== undefined && !input.crm.trim()) {
    errors.push('crm must not be empty');
  }

  if (input.mainSpecialty !== undefined && !input.mainSpecialty.trim()) {
    errors.push('mainSpecialty must not be empty');
  }

  if (
    input.consultationFee !== undefined &&
    input.consultationFee !== null &&
    (typeof input.consultationFee !== 'number' || input.consultationFee < 0)
  ) {
    errors.push('consultationFee must be a non-negative number');
  }

  if (input.profilePhotoUrl !== undefined && input.profilePhotoUrl !== null) {
    errors.push(...validateProfilePhotoUrl(input.profilePhotoUrl));
  }

  return errors;
}

export function toDoctorProfileResponse(profile: {
  name: string;
  crm: string;
  rqe: string | null;
  mainSpecialty: string;
  bio: string | null;
  profilePhotoUrl: string | null;
  isOnline: boolean;
  consultationFee: { toNumber(): number } | null;
  availability: unknown;
}) {
  return {
    name: profile.name,
    crm: profile.crm,
    rqe: profile.rqe,
    mainSpecialty: profile.mainSpecialty,
    bio: profile.bio,
    profilePhotoUrl: profile.profilePhotoUrl,
    isOnline: profile.isOnline,
    consultationFee: profile.consultationFee ? profile.consultationFee.toNumber() : null,
    availability: profile.availability ?? null,
  };
}
