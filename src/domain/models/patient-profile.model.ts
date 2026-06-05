import { toHealthConditionResponse } from './health-condition.model';
import { toMedicationResponse } from './medication.model';

export interface PatientProfileUpdateInput {
  name?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  medicalHistory?: string;
  allergies?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  bloodType?: string;
  height?: string;
  weight?: string;
  profilePhotoUrl?: string | null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function validatePatientProfileUpdate(input: PatientProfileUpdateInput): string[] {
  const errors: string[] = [];

  if (input.name !== undefined && !input.name.trim()) {
    errors.push('name must not be empty');
  }

  if (input.dateOfBirth !== undefined) {
    if (!ISO_DATE_REGEX.test(input.dateOfBirth)) {
      errors.push('dateOfBirth must be a valid ISO date (YYYY-MM-DD)');
    } else {
      const parsed = new Date(`${input.dateOfBirth}T00:00:00.000Z`);
      if (Number.isNaN(parsed.getTime())) {
        errors.push('dateOfBirth must be a valid date');
      }
    }
  }

  if (input.bloodType !== undefined && input.bloodType !== null && input.bloodType !== '') {
    if (!BLOOD_TYPES.includes(input.bloodType as (typeof BLOOD_TYPES)[number])) {
      errors.push(`bloodType must be one of: ${BLOOD_TYPES.join(', ')}`);
    }
  }

  if (input.profilePhotoUrl !== undefined && input.profilePhotoUrl !== null) {
    const photoErrors = validateProfilePhotoUrl(input.profilePhotoUrl);
    errors.push(...photoErrors);
  }

  return errors;
}

export function validateProfilePhotoUrl(photoUrl: string): string[] {
  const errors: string[] = [];

  if (!photoUrl.trim()) {
    errors.push('profilePhotoUrl must not be empty');
    return errors;
  }

  if (photoUrl.startsWith('data:')) {
    const base64Match = /^data:image\/[\w+.-]+;base64,(.+)$/.exec(photoUrl);
    if (!base64Match) {
      errors.push('profilePhotoUrl must be a valid image data URL or HTTP(S) URL');
      return errors;
    }

    const estimatedBytes = Math.ceil((base64Match[1].length * 3) / 4);
    if (estimatedBytes > MAX_PHOTO_BYTES) {
      errors.push('profile photo must not exceed 5MB');
    }
    return errors;
  }

  try {
    const url = new URL(photoUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      errors.push('profilePhotoUrl must be an HTTP(S) URL or image data URL');
    }
  } catch {
    errors.push('profilePhotoUrl must be a valid URL');
  }

  return errors;
}

export function toPatientProfileResponse(profile: {
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
  healthConditions?: Array<{
    id: string;
    name: string;
    classification: string;
    score: string | null;
    severity: Parameters<typeof toHealthConditionResponse>[0]['severity'];
    icon: Parameters<typeof toHealthConditionResponse>[0]['icon'];
    lastAssessed: Date;
    treatment: string | null;
  }>;
  medications?: Array<{
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    instructions: string | null;
    nextDose: string | null;
    refillBy: Date | null;
    quantityRemaining: number | null;
    presentation: string | null;
  }>;
}) {
  return {
    name: profile.name,
    phone: profile.phone,
    dateOfBirth: profile.dateOfBirth.toISOString().slice(0, 10),
    gender: profile.gender,
    address: profile.address,
    medicalHistory: profile.medicalHistory,
    allergies: profile.allergies,
    emergencyContact: profile.emergencyContact,
    emergencyPhone: profile.emergencyPhone,
    bloodType: profile.bloodType,
    height: profile.height,
    weight: profile.weight,
    profilePhotoUrl: profile.profilePhotoUrl,
    healthConditions: profile.healthConditions?.map(toHealthConditionResponse),
    medications: profile.medications?.map(toMedicationResponse),
  };
}

export { EMAIL_REGEX, BLOOD_TYPES, MAX_PHOTO_BYTES };
