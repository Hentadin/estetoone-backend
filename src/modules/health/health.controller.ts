import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto } from './dto/health-response.dto';
import { LivenessResponseDto } from './dto/liveness-response.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({ type: LivenessResponseDto })
  getLiveness(): LivenessResponseDto {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (DB + Redis)' })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ description: 'Dependencies degraded' })
  async getReadiness(): Promise<HealthResponseDto> {
    const result = await this.healthService.getReadiness();
    if (result.status !== 'ok') {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Aggregate health status (always 200)' })
  @ApiOkResponse({ type: HealthResponseDto })
  async getHealth(): Promise<HealthResponseDto> {
    return this.healthService.getHealth();
  }
}
