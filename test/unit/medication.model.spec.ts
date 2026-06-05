import { validateMedication, toMedicationResponse } from '../../src/domain/models/medication.model';

describe('Medication model', () => {
  it('validates required fields and quantity', () => {
    const errors = validateMedication({
      name: '',
      dosage: '',
      frequency: '',
      quantityRemaining: -1,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'name is required',
        'dosage is required',
        'frequency is required',
        'quantityRemaining must be a non-negative integer',
      ]),
    );
  });

  it('accepts valid medication input', () => {
    const errors = validateMedication({
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily',
      quantityRemaining: 12,
    });

    expect(errors).toHaveLength(0);
  });

  it('maps to frontend-compatible response shape', () => {
    const response = toMedicationResponse({
      id: 'med-1',
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily',
      instructions: 'Take with breakfast and dinner',
      nextDose: '8:00 AM',
      refillBy: null,
      quantityRemaining: 12,
      presentation: 'Oral tablet',
    });

    expect(response).toEqual({
      id: 'med-1',
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily',
      instructions: 'Take with breakfast and dinner',
      nextDose: '8:00 AM',
      refillBy: undefined,
      quantityRemaining: 12,
      presentation: 'Oral tablet',
    });
  });
});
