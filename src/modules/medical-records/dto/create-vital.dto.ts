import { VitalType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateVitalDto {
  @IsEnum(VitalType)
  type!: VitalType;

  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}
