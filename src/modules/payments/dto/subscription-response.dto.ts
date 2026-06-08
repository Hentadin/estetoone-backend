import { ApiProperty } from '@nestjs/swagger';
import { PaymentPlanType, SubscriptionStatus } from '@prisma/client';

export class SubscriptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  planId!: string;

  @ApiProperty({ enum: PaymentPlanType })
  planType!: PaymentPlanType;

  @ApiProperty()
  planName!: string;

  @ApiProperty({ enum: SubscriptionStatus })
  status!: SubscriptionStatus;

  @ApiProperty({ nullable: true, format: 'date-time' })
  currentPeriodEnd!: string | null;

  @ApiProperty({ nullable: true })
  stripeCustomerId!: string | null;
}
