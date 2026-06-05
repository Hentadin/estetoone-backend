import { ConditionIcon, ConditionSeverity } from '@prisma/client';

export interface HealthConditionInput {
  name: string;
  classification: string;
  score?: string;
  severity: ConditionSeverity;
  icon?: ConditionIcon;
  lastAssessed: Date;
  treatment?: string;
}

export function validateHealthCondition(input: HealthConditionInput): string[] {
  const errors: string[] = [];

  if (!input.name?.trim()) {
    errors.push('name is required');
  }
  if (!input.classification?.trim()) {
    errors.push('classification is required');
  }
  if (!Object.values(ConditionSeverity).includes(input.severity)) {
    errors.push('severity must be mild, moderate, severe, or controlled');
  }
  if (input.icon && !Object.values(ConditionIcon).includes(input.icon)) {
    errors.push('icon is invalid');
  }
  if (!(input.lastAssessed instanceof Date) || Number.isNaN(input.lastAssessed.getTime())) {
    errors.push('lastAssessed must be a valid date');
  }

  return errors;
}

export function toHealthConditionResponse(condition: {
  id: string;
  name: string;
  classification: string;
  score: string | null;
  severity: ConditionSeverity;
  icon: ConditionIcon;
  lastAssessed: Date;
  treatment: string | null;
}) {
  return {
    id: condition.id,
    name: condition.name,
    classification: condition.classification,
    score: condition.score ?? undefined,
    severity: condition.severity,
    icon: condition.icon,
    lastAssessed: condition.lastAssessed.toISOString().split('T')[0],
    treatment: condition.treatment ?? undefined,
  };
}
