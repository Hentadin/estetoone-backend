import { Controller, Get, HttpCode, Param } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlanResponseDto } from './dto/plan-response.dto';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @HttpCode(200)
  listPlans(): Promise<PlanResponseDto[]> {
    return this.plansService.listPlans();
  }

  @Get(':planId/validate')
  @HttpCode(200)
  validatePlan(@Param('planId') planId: string): Promise<PlanResponseDto> {
    return this.plansService.validatePlan(planId);
  }
}
