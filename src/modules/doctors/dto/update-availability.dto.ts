import { IsObject, IsOptional } from 'class-validator';

export class UpdateAvailabilityDto {
  @IsObject()
  availability!: Record<string, unknown>;
}

export class PatchAvailabilityDto {
  @IsOptional()
  @IsObject()
  availability?: Record<string, unknown>;
}
