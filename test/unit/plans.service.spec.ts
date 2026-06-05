import { NotFoundException } from '@nestjs/common';
import { PlansService } from '../../src/modules/plans/plans.service';
import { PlansRepository } from '../../src/modules/plans/plans.repository';

describe('PlansService', () => {
  const plansRepository = {
    findActivePlans: jest.fn(),
    findActivePlanByType: jest.fn(),
  } as unknown as PlansRepository;

  const service = new PlansService(plansRepository);

  it('lists active plans', async () => {
    plansRepository.findActivePlans = jest.fn().mockResolvedValue([
      {
        type: 'basic',
        name: 'Basic',
        description: 'Free tier',
        priceMonthly: 0,
        features: ['Health wallet'],
      },
    ]);

    const plans = await service.listPlans();

    expect(plans).toEqual([
      {
        id: 'basic',
        type: 'basic',
        name: 'Basic',
        description: 'Free tier',
        priceMonthly: 0,
        features: ['Health wallet'],
      },
    ]);
  });

  it('validates an existing plan', async () => {
    plansRepository.findActivePlanByType = jest.fn().mockResolvedValue({
      type: 'premium',
      name: 'Premium',
      description: 'Paid tier',
      priceMonthly: 49.9,
      features: ['Unlimited consultations'],
    });

    const plan = await service.validatePlan('premium');

    expect(plan.type).toBe('premium');
    expect(plan.priceMonthly).toBe(49.9);
  });

  it('throws when plan is unavailable', async () => {
    plansRepository.findActivePlanByType = jest.fn().mockResolvedValue(null);

    await expect(service.validatePlan('missing')).rejects.toThrow(NotFoundException);
  });
});
