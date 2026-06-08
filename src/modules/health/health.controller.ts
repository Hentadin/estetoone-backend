import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthResponseDto } from './dto/health-response.dto';
import { LivenessResponseDto } from './dto/liveness-response.dto';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  getLiveness(): LivenessResponseDto {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  async getReadiness(): Promise<HealthResponseDto> {
    const result = await this.healthService.getReadiness();
    if (result.status !== 'ok') {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }

  @Get()
  async getHealth(): Promise<HealthResponseDto> {
    return this.healthService.getHealth();
  }
}
