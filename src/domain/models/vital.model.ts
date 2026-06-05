import { VitalType } from '@prisma/client';

export interface VitalInput {
  type: VitalType;
  value: string;
  unit?: string;
  recordedAt?: Date;
}

export function validateVitalInput(input: VitalInput): string[] {
  const errors: string[] = [];

  if (!Object.values(VitalType).includes(input.type)) {
    errors.push('type must be a valid vital type');
  }

  if (!input.value?.trim()) {
    errors.push('value is required');
  }

  if (input.recordedAt !== undefined) {
    if (!(input.recordedAt instanceof Date) || Number.isNaN(input.recordedAt.getTime())) {
      errors.push('recordedAt must be a valid date');
    }
  }

  return errors;
}

export function toVitalResponse(vital: {
  id: string;
  type: VitalType;
  value: string;
  unit: string | null;
  recordedAt: Date;
}) {
  return {
    id: vital.id,
    type: vital.type,
    value: vital.value,
    unit: vital.unit ?? undefined,
    recordedAt: vital.recordedAt.toISOString(),
  };
}
