import { Injectable } from '@nestjs/common';
import { HealthResponseDto } from './dto/health-response.dto';
import { HealthRepository } from './health.repository';

@Injectable()
export class HealthService {
  constructor(private readonly healthRepository: HealthRepository) {}

  async getHealth(): Promise<HealthResponseDto> {
    const [dbUp, redisUp] = await Promise.all([
      this.healthRepository.checkDatabase(),
      this.healthRepository.checkRedis(),
    ]);

    return {
      status: dbUp && redisUp ? 'ok' : 'degraded',
      db: dbUp ? 'up' : 'down',
      redis: redisUp ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    };
  }
}
