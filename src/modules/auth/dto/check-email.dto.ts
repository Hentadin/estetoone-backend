import { IsEmail } from 'class-validator';

export class CheckEmailQueryDto {
  @IsEmail()
  email!: string;
}
