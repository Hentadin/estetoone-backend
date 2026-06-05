import { ConditionSeverity } from '@prisma/client';
import {
  toHealthConditionResponse,
  validateHealthCondition,
} from '../../src/domain/models/health-condition.model';

describe('HealthCondition model', () => {
  it('validates required fields', () => {
    const errors = validateHealthCondition({
      name: '',
      classification: '',
      severity: 'invalid' as ConditionSeverity,
      lastAssessed: new Date('invalid'),
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'name is required',
        'classification is required',
        'severity must be mild, moderate, severe, or controlled',
        'lastAssessed must be a valid date',
      ]),
    );
  });

  it('accepts valid input', () => {
    const errors = validateHealthCondition({
      name: 'Hypertension',
      classification: 'ACC/AHA',
      severity: ConditionSeverity.controlled,
      lastAssessed: new Date('2025-05-02'),
    });

    expect(errors).toHaveLength(0);
  });

  it('maps to frontend-compatible response shape', () => {
    const response = toHealthConditionResponse({
      id: 'cond-1',
      name: 'Type 2 Diabetes Mellitus',
      classification: 'ADA',
      score: 'HbA1c: 7.2%',
      severity: ConditionSeverity.controlled,
      icon: 'pill',
      lastAssessed: new Date('2025-04-28'),
      treatment: 'Metformin',
    });

    expect(response).toEqual({
      id: 'cond-1',
      name: 'Type 2 Diabetes Mellitus',
      classification: 'ADA',
      score: 'HbA1c: 7.2%',
      severity: 'controlled',
      icon: 'pill',
      lastAssessed: '2025-04-28',
      treatment: 'Metformin',
    });
  });
});
