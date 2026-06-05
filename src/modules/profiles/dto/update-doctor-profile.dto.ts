import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateDoctorProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  crm?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  rqe?: string | null;

  @IsOptional()
  @IsString()
  mainSpecialty?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  bio?: string | null;

  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber()
  @Min(0)
  consultationFee?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsObject()
  availability?: Record<string, unknown> | null;
}
