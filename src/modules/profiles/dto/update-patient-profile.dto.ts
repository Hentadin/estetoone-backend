import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { BLOOD_TYPES } from '../../../domain/models/patient-profile.model';

export class UpdatePatientProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  emergencyPhone?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsIn([...BLOOD_TYPES])
  bloodType?: string;

  @IsOptional()
  @IsString()
  height?: string;

  @IsOptional()
  @IsString()
  weight?: string;
}
