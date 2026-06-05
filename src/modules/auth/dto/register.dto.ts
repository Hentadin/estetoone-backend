import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PaymentPlanType, UserRole } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsDateString()
  dateOfBirth!: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  emergencyPhone?: string;

  @IsEnum(PaymentPlanType)
  planId!: PaymentPlanType;

  @IsEnum(UserRole)
  role!: UserRole;

  @ValidateIf((dto: RegisterDto) => dto.role === UserRole.doctor)
  @IsString()
  @IsNotEmpty()
  crm?: string;

  @ValidateIf((dto: RegisterDto) => dto.role === UserRole.doctor)
  @IsString()
  @IsNotEmpty()
  mainSpecialty?: string;
}
