/**
 * PHI/PII field paths for Pino log redaction.
 * Per HEN-6 §6.2: logs must never contain clinical or personal health data.
 */
export const PHI_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.passwordHash',
  'req.body.email',
  'req.body.nomeCompleto',
  'req.body.cpf',
  'req.body.telefone',
  'req.body.endereco',
  'req.body.dataNascimento',
  'req.body.diagnosis',
  'req.body.treatment',
  'req.body.instructions',
  'req.body.notes',
  'req.body.symptoms',
  'req.body.conditions',
  'req.body.medications',
  'req.body.vitals',
  'req.body.metadata',
  'res.body.password',
  'res.body.passwordHash',
  'res.body.email',
  'res.body.nomeCompleto',
  'res.body.cpf',
  'res.body.telefone',
  'res.body.conditions',
  'res.body.medications',
  'res.body.vitals',
  'res.body.healthConditions',
  'res.body.diagnosis',
  'res.body.treatment',
  'res.body.notes',
  'res.body.symptoms',
] as const;

export const PHI_REDACT_CENSOR = '[REDACTED]';

export function sanitizeForLog<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item)) as T;
  }

  if (typeof value !== 'object') {
    return value;
  }

  const sensitiveKeys = new Set([
    'password',
    'passwordHash',
    'email',
    'nomeCompleto',
    'cpf',
    'telefone',
    'endereco',
    'dataNascimento',
    'diagnosis',
    'treatment',
    'instructions',
    'notes',
    'symptoms',
    'conditions',
    'medications',
    'vitals',
    'healthConditions',
    'metadata',
    'token',
    'accessToken',
    'refreshToken',
  ]);

  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (sensitiveKeys.has(key)) {
      result[key] = PHI_REDACT_CENSOR;
      continue;
    }
    result[key] = sanitizeForLog(nested);
  }

  return result as T;
}
