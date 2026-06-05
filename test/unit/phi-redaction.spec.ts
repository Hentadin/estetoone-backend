import {
  PHI_REDACT_CENSOR,
  PHI_REDACT_PATHS,
  sanitizeForLog,
} from '../../src/infrastructure/logging/phi-redaction';

describe('PHI redaction', () => {
  it('defines redaction paths for request and response bodies', () => {
    expect(PHI_REDACT_PATHS).toEqual(
      expect.arrayContaining(['req.body.password', 'req.body.email', 'res.body.medications']),
    );
  });

  it('redacts sensitive fields from nested objects', () => {
    const input = {
      userId: 'user-1',
      email: 'maria.silva@example.com',
      profile: {
        nomeCompleto: 'Maria Silva',
        telefone: '11999999999',
      },
      medications: [{ name: 'Losartan', dosage: '50mg' }],
      token: 'secret-token',
    };

    const sanitized = sanitizeForLog(input);

    expect(sanitized).toEqual({
      userId: 'user-1',
      email: PHI_REDACT_CENSOR,
      profile: {
        nomeCompleto: PHI_REDACT_CENSOR,
        telefone: PHI_REDACT_CENSOR,
      },
      medications: PHI_REDACT_CENSOR,
      token: PHI_REDACT_CENSOR,
    });
  });

  it('preserves non-sensitive fields', () => {
    const input = {
      status: 'ok',
      role: 'patient',
      page: 1,
    };

    expect(sanitizeForLog(input)).toEqual(input);
  });
});
