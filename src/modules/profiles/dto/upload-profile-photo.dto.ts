import { IsNotEmpty, IsString } from 'class-validator';

export class UploadProfilePhotoDto {
  @IsString()
  @IsNotEmpty()
  profilePhotoUrl!: string;
}
