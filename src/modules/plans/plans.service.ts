import { Injectable, NotFoundException } from '@nestjs/common';
import { PlansRepository } from './plans.repository';
import { PlanResponseDto } from './dto/plan-response.dto';

@Injectable()
export class PlansService {
  constructor(private readonly plansRepository: PlansRepository) {}

  async listPlans(): Promise<PlanResponseDto[]> {
    const plans = await this.plansRepository.findActivePlans();
    return plans.map((plan) => ({
      id: plan.type,
      type: plan.type,
      name: plan.name,
      description: plan.description,
      priceMonthly: Number(plan.priceMonthly),
      features: Array.isArray(plan.features) ? (plan.features as string[]) : [],
    }));
  }

  async validatePlan(planId: string): Promise<PlanResponseDto> {
    const plan = await this.plansRepository.findActivePlanByType(planId);

    if (!plan) {
      throw new NotFoundException(`Plan "${planId}" is not available`);
    }

    return {
      id: plan.type,
      type: plan.type,
      name: plan.name,
      description: plan.description,
      priceMonthly: Number(plan.priceMonthly),
      features: Array.isArray(plan.features) ? (plan.features as string[]) : [],
    };
  }
}
