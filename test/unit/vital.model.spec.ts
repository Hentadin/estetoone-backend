import { VitalType } from '@prisma/client';
import { validateVitalInput } from '../../src/domain/models/vital.model';

describe('vital.model', () => {
  it('accepts valid vital input', () => {
    const errors = validateVitalInput({
      type: VitalType.heart_rate,
      value: '72',
      unit: 'bpm',
    });

    expect(errors).toEqual([]);
  });

  it('rejects missing value', () => {
    const errors = validateVitalInput({
      type: VitalType.glucose,
      value: '',
    });

    expect(errors).toContain('value is required');
  });
});
