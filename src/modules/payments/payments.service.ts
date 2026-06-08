import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatus } from '@prisma/client';
import {
  STRIPE_CLIENT,
  StripeClient,
  StripeWebhookEvent,
} from '../../infrastructure/payments/stripe-client.interface';
import { PaymentPlanResponseDto } from './dto/plan-response.dto';
import { SetupIntentResponseDto } from './dto/setup-intent-response.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { PaymentsRepository } from './payments.repository';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    @Inject(STRIPE_CLIENT) private readonly stripeClient: StripeClient,
    private readonly configService: ConfigService,
  ) {}

  async listPlans(): Promise<PaymentPlanResponseDto[]> {
    const plans = await this.paymentsRepository.findActivePlans();
    return plans.map((plan) => ({
      id: plan.type,
      type: plan.type,
      name: plan.name,
      description: plan.description,
      priceMonthly: Number(plan.priceMonthly),
      features: Array.isArray(plan.features) ? (plan.features as string[]) : [],
    }));
  }

  async createSetupIntent(userId: string): Promise<SetupIntentResponseDto> {
    const user = await this.paymentsRepository.findUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let stripeCustomerId = user.subscription?.stripeCustomerId ?? null;

    if (!stripeCustomerId) {
      const customer = await this.stripeClient.createCustomer(user.email, {
        userId: user.id,
      });
      stripeCustomerId = customer.id;

      const planId = user.planId ?? (await this.resolveDefaultPlanId());
      await this.paymentsRepository.upsertSubscription({
        userId: user.id,
        planId,
        stripeCustomerId,
        status: SubscriptionStatus.trialing,
      });
    }

    const setupIntent = await this.stripeClient.createSetupIntent(stripeCustomerId);

    return {
      clientSecret: setupIntent.clientSecret,
      setupIntentId: setupIntent.id,
    };
  }

  async getSubscription(userId: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.paymentsRepository.findSubscriptionByUserId(userId);

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return this.toSubscriptionResponse(subscription);
  }

  async handleWebhook(
    payload: Buffer,
    signature: string | undefined,
  ): Promise<{ received: true }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const secret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || 'test_webhook_secret';
    const event = this.stripeClient.constructWebhookEvent(payload, signature, secret);

    return this.processWebhookEvent(event);
  }

  private async processWebhookEvent(event: StripeWebhookEvent): Promise<{ received: true }> {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.syncSubscriptionFromStripe(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.cancelSubscriptionFromStripe(event.data.object);
        break;
      default:
        break;
    }

    return { received: true };
  }

  private async syncSubscriptionFromStripe(
    stripeSubscription: Record<string, unknown>,
  ): Promise<void> {
    const stripeSubscriptionId = stripeSubscription.id as string | undefined;
    const stripeCustomerId = stripeSubscription.customer as string | undefined;
    const status = this.mapStripeStatus(stripeSubscription.status as string | undefined);
    const currentPeriodEnd = stripeSubscription.current_period_end
      ? new Date((stripeSubscription.current_period_end as number) * 1000)
      : null;

    const priceId = this.extractPriceId(stripeSubscription);
    const plan = priceId
      ? await this.paymentsRepository.findPlanByStripePriceId(priceId)
      : null;

    let subscription = stripeSubscriptionId
      ? await this.paymentsRepository.findSubscriptionByStripeId(stripeSubscriptionId)
      : null;

    if (!subscription && stripeCustomerId) {
      subscription = await this.paymentsRepository.findSubscriptionByStripeCustomerId(
        stripeCustomerId,
      );
    }

    if (!subscription) {
      return;
    }

    const planId = plan?.id ?? subscription.planId;

    await this.paymentsRepository.upsertSubscription({
      userId: subscription.userId,
      planId,
      stripeCustomerId: stripeCustomerId ?? subscription.stripeCustomerId,
      stripeSubscriptionId: stripeSubscriptionId ?? subscription.stripeSubscriptionId,
      status,
      currentPeriodEnd,
    });

    await this.paymentsRepository.updateUserPlanId(subscription.userId, planId);
  }

  private async cancelSubscriptionFromStripe(
    stripeSubscription: Record<string, unknown>,
  ): Promise<void> {
    const stripeSubscriptionId = stripeSubscription.id as string | undefined;
    if (!stripeSubscriptionId) {
      return;
    }

    const subscription =
      await this.paymentsRepository.findSubscriptionByStripeId(stripeSubscriptionId);

    if (!subscription) {
      return;
    }

    const basicPlan = await this.paymentsRepository.findPlanByType('basic');
    const planId = basicPlan?.id ?? subscription.planId;

    await this.paymentsRepository.upsertSubscription({
      userId: subscription.userId,
      planId,
      stripeCustomerId: subscription.stripeCustomerId,
      stripeSubscriptionId,
      status: SubscriptionStatus.cancelled,
      currentPeriodEnd: subscription.currentPeriodEnd,
    });

    await this.paymentsRepository.updateUserPlanId(subscription.userId, planId);
  }

  private extractPriceId(stripeSubscription: Record<string, unknown>): string | undefined {
    const items = stripeSubscription.items as
      | { data?: Array<{ price?: { id?: string } }> }
      | undefined;
    return items?.data?.[0]?.price?.id;
  }

  private mapStripeStatus(stripeStatus: string | undefined): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
        return SubscriptionStatus.active;
      case 'past_due':
        return SubscriptionStatus.past_due;
      case 'trialing':
        return SubscriptionStatus.trialing;
      case 'canceled':
      case 'cancelled':
        return SubscriptionStatus.cancelled;
      default:
        return SubscriptionStatus.active;
    }
  }

  private async resolveDefaultPlanId(): Promise<string> {
    const basicPlan = await this.paymentsRepository.findPlanByType('basic');
    if (!basicPlan) {
      throw new NotFoundException('Default plan not configured');
    }
    return basicPlan.id;
  }

  private toSubscriptionResponse(subscription: {
    id: string;
    planId: string;
    status: SubscriptionStatus;
    currentPeriodEnd: Date | null;
    stripeCustomerId: string | null;
    plan: { type: string; name: string };
  }): SubscriptionResponseDto {
    return {
      id: subscription.id,
      planId: subscription.planId,
      planType: subscription.plan.type as SubscriptionResponseDto['planType'],
      planName: subscription.plan.name,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd
        ? subscription.currentPeriodEnd.toISOString()
        : null,
      stripeCustomerId: subscription.stripeCustomerId,
    };
  }
}
