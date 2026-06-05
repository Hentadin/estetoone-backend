import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis(this.configService.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async ping(): Promise<boolean> {
    try {
      if (this.client.status !== 'ready') {
        await this.client.connect();
      }
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  async onModuleDestroy() {
    if (this.client.status === 'ready' || this.client.status === 'connect') {
      await this.client.quit();
    }
  }
}
