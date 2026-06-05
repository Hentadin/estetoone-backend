import { IsOptional, IsString } from 'class-validator';

export class InstantConsultationRequestDto {
  @IsOptional()
  @IsString()
  specialty?: string;
}
