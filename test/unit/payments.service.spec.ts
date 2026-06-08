import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatus } from '@prisma/client';
import { StripeClient } from '../../src/infrastructure/payments/stripe-client.interface';
import { PaymentsRepository } from '../../src/modules/payments/payments.repository';
import { PaymentsService } from '../../src/modules/payments/payments.service';

describe('PaymentsService', () => {
  const paymentsRepository = {
    findActivePlans: jest.fn(),
    findUserById: jest.fn(),
    findSubscriptionByUserId: jest.fn(),
    findPlanByStripePriceId: jest.fn(),
    findPlanByType: jest.fn(),
    upsertSubscription: jest.fn(),
    updateUserPlanId: jest.fn(),
    findSubscriptionByStripeId: jest.fn(),
    findSubscriptionByStripeCustomerId: jest.fn(),
  } as unknown as PaymentsRepository;

  const stripeClient = {
    createCustomer: jest.fn(),
    createSetupIntent: jest.fn(),
    constructWebhookEvent: jest.fn(),
  } as unknown as StripeClient;

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'STRIPE_WEBHOOK_SECRET') {
        return 'test_webhook_secret';
      }
      return undefined;
    }),
  } as unknown as ConfigService;

  const service = new PaymentsService(paymentsRepository, stripeClient, configService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists active payment plans', async () => {
    paymentsRepository.findActivePlans = jest.fn().mockResolvedValue([
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

  it('creates setup intent for user without stripe customer', async () => {
    paymentsRepository.findUserById = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      planId: 'plan-basic',
      subscription: null,
    });
    stripeClient.createCustomer = jest.fn().mockResolvedValue({ id: 'cus_123' });
    stripeClient.createSetupIntent = jest.fn().mockResolvedValue({
      id: 'seti_123',
      clientSecret: 'seti_123_secret',
    });
    paymentsRepository.upsertSubscription = jest.fn().mockResolvedValue({});

    const result = await service.createSetupIntent('user-1');

    expect(stripeClient.createCustomer).toHaveBeenCalledWith('user@example.com', {
      userId: 'user-1',
    });
    expect(paymentsRepository.upsertSubscription).toHaveBeenCalledWith({
      userId: 'user-1',
      planId: 'plan-basic',
      stripeCustomerId: 'cus_123',
      status: SubscriptionStatus.trialing,
    });
    expect(result).toEqual({
      clientSecret: 'seti_123_secret',
      setupIntentId: 'seti_123',
    });
  });

  it('reuses existing stripe customer for setup intent', async () => {
    paymentsRepository.findUserById = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      planId: 'plan-basic',
      subscription: { stripeCustomerId: 'cus_existing' },
    });
    stripeClient.createSetupIntent = jest.fn().mockResolvedValue({
      id: 'seti_456',
      clientSecret: 'seti_456_secret',
    });

    const result = await service.createSetupIntent('user-1');

    expect(stripeClient.createCustomer).not.toHaveBeenCalled();
    expect(stripeClient.createSetupIntent).toHaveBeenCalledWith('cus_existing');
    expect(result.setupIntentId).toBe('seti_456');
  });

  it('throws when user is not found for setup intent', async () => {
    paymentsRepository.findUserById = jest.fn().mockResolvedValue(null);

    await expect(service.createSetupIntent('missing')).rejects.toThrow(NotFoundException);
  });

  it('returns subscription for authenticated user', async () => {
    paymentsRepository.findSubscriptionByUserId = jest.fn().mockResolvedValue({
      id: 'sub-1',
      planId: 'plan-basic',
      status: SubscriptionStatus.active,
      currentPeriodEnd: new Date('2026-07-01T00:00:00Z'),
      stripeCustomerId: 'cus_123',
      plan: { type: 'basic', name: 'Basic' },
    });

    const subscription = await service.getSubscription('user-1');

    expect(subscription).toEqual({
      id: 'sub-1',
      planId: 'plan-basic',
      planType: 'basic',
      planName: 'Basic',
      status: SubscriptionStatus.active,
      currentPeriodEnd: '2026-07-01T00:00:00.000Z',
      stripeCustomerId: 'cus_123',
    });
  });

  it('throws when subscription is not found', async () => {
    paymentsRepository.findSubscriptionByUserId = jest.fn().mockResolvedValue(null);

    await expect(service.getSubscription('user-1')).rejects.toThrow(NotFoundException);
  });

  it('rejects webhook without signature', async () => {
    await expect(service.handleWebhook(Buffer.from('{}'), undefined)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('processes subscription.updated webhook events', async () => {
    const payload = Buffer.from(
      JSON.stringify({
        id: 'evt_1',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_stripe_1',
            customer: 'cus_123',
            status: 'active',
            current_period_end: 1782864000,
            items: { data: [{ price: { id: 'price_premium' } }] },
          },
        },
      }),
    );

    stripeClient.constructWebhookEvent = jest.fn().mockReturnValue(JSON.parse(payload.toString()));
    paymentsRepository.findSubscriptionByStripeId = jest.fn().mockResolvedValue({
      userId: 'user-1',
      planId: 'plan-basic',
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_stripe_1',
      currentPeriodEnd: null,
    });
    paymentsRepository.findPlanByStripePriceId = jest.fn().mockResolvedValue({
      id: 'plan-premium',
    });
    paymentsRepository.upsertSubscription = jest.fn().mockResolvedValue({});
    paymentsRepository.updateUserPlanId = jest.fn().mockResolvedValue({});

    const result = await service.handleWebhook(payload, 'whsec_mock_test_webhook_secret');

    expect(result).toEqual({ received: true });
    expect(paymentsRepository.upsertSubscription).toHaveBeenCalled();
    expect(paymentsRepository.updateUserPlanId).toHaveBeenCalledWith('user-1', 'plan-premium');
  });

  it('rejects invalid webhook signatures via stripe client', async () => {
    stripeClient.constructWebhookEvent = jest.fn().mockImplementation(() => {
      throw new BadRequestException('Invalid webhook signature');
    });

    await expect(
      service.handleWebhook(Buffer.from('{}'), 'invalid_signature'),
    ).rejects.toThrow(BadRequestException);
  });
});
