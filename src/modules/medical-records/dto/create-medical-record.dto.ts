import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { MEDICAL_RECORD_EXAM_TYPES } from '../../../domain/models/medical-record.model';

export class CreateMedicalRecordDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsIn(MEDICAL_RECORD_EXAM_TYPES)
  examType?: string;

  @IsOptional()
  @IsString()
  aiInterpretation?: string;

  @IsOptional()
  @IsString()
  documentData?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsUUID()
  consultationId?: string;
}
