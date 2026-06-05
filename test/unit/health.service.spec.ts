import { HealthService } from '../../src/modules/health/health.service';
import { HealthRepository } from '../../src/modules/health/health.repository';

describe('HealthService', () => {
  const healthRepository = {
    checkDatabase: jest.fn(),
    checkRedis: jest.fn(),
  } as unknown as HealthRepository;

  const service = new HealthService(healthRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ok when db and redis are up', async () => {
    healthRepository.checkDatabase = jest.fn().mockResolvedValue(true);
    healthRepository.checkRedis = jest.fn().mockResolvedValue(true);

    const result = await service.getHealth();

    expect(result.status).toBe('ok');
    expect(result.db).toBe('up');
    expect(result.redis).toBe('up');
    expect(result.timestamp).toBeDefined();
  });

  it('returns degraded when a dependency is down', async () => {
    healthRepository.checkDatabase = jest.fn().mockResolvedValue(true);
    healthRepository.checkRedis = jest.fn().mockResolvedValue(false);

    const result = await service.getHealth();

    expect(result.status).toBe('degraded');
    expect(result.redis).toBe('down');
  });
});
