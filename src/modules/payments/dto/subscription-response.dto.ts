import { PaymentPlanType, SubscriptionStatus } from '@prisma/client';

export class SubscriptionResponseDto {
  id!: string;
  planId!: string;
  planType!: PaymentPlanType;
  planName!: string;
  status!: SubscriptionStatus;
  currentPeriodEnd!: string | null;
  stripeCustomerId!: string | null;
}
