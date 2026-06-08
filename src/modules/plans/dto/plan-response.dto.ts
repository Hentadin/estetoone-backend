import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlanResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty()
  priceMonthly!: number;

  @ApiProperty({ type: [String] })
  features!: string[];
}
