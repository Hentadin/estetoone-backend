import { IsISO8601, IsUUID } from 'class-validator';

export class ScheduleConsultationDto {
  @IsUUID()
  doctorId!: string;

  @IsISO8601()
  scheduledAt!: string;
}
