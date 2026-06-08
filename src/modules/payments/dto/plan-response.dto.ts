import { ApiProperty } from '@nestjs/swagger';
import { PaymentPlanType } from '@prisma/client';

export class PaymentPlanResponseDto {
  @ApiProperty({ enum: PaymentPlanType })
  id!: PaymentPlanType;

  @ApiProperty({ enum: PaymentPlanType })
  type!: PaymentPlanType;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  priceMonthly!: number;

  @ApiProperty({ type: [String] })
  features!: string[];
}
