export interface MedicationInput {
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  nextDose?: string;
  quantityRemaining?: number;
  presentation?: string;
}

export function validateMedication(input: MedicationInput): string[] {
  const errors: string[] = [];

  if (!input.name?.trim()) {
    errors.push('name is required');
  }
  if (!input.dosage?.trim()) {
    errors.push('dosage is required');
  }
  if (!input.frequency?.trim()) {
    errors.push('frequency is required');
  }
  if (
    input.quantityRemaining !== undefined &&
    (!Number.isInteger(input.quantityRemaining) || input.quantityRemaining < 0)
  ) {
    errors.push('quantityRemaining must be a non-negative integer');
  }

  return errors;
}

export function toMedicationResponse(medication: {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string | null;
  nextDose: string | null;
  refillBy: Date | null;
  quantityRemaining: number | null;
  presentation: string | null;
}) {
  return {
    id: medication.id,
    name: medication.name,
    dosage: medication.dosage,
    frequency: medication.frequency,
    instructions: medication.instructions ?? undefined,
    nextDose: medication.nextDose ?? undefined,
    refillBy: medication.refillBy?.toISOString().split('T')[0],
    quantityRemaining: medication.quantityRemaining ?? undefined,
    presentation: medication.presentation ?? undefined,
  };
}
