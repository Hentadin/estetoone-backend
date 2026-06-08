import { Controller, Get, HttpCode, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { PlanResponseDto } from './dto/plan-response.dto';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List available subscription plans' })
  @ApiOkResponse({ type: PlanResponseDto, isArray: true })
  listPlans(): Promise<PlanResponseDto[]> {
    return this.plansService.listPlans();
  }

  @Get(':planId/validate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Validate plan availability by id' })
  @ApiOkResponse({ type: PlanResponseDto })
  validatePlan(@Param('planId') planId: string): Promise<PlanResponseDto> {
    return this.plansService.validatePlan(planId);
  }
}
