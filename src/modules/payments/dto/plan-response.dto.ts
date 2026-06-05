import { PaymentPlanType } from '@prisma/client';

export class PaymentPlanResponseDto {
  id!: PaymentPlanType;
  type!: PaymentPlanType;
  name!: string;
  description!: string | null;
  priceMonthly!: number;
  features!: string[];
}
