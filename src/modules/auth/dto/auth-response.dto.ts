import { UserRole } from '@prisma/client';

export class AuthUserDto {
  id!: string;
  email!: string;
  role!: UserRole;
  name?: string;
}

export class AuthResponseDto {
  accessToken!: string;
  user!: AuthUserDto;
}

export class MeResponseDto {
  id!: string;
  email!: string;
  role!: UserRole;
  planId?: string | null;
  profile?: Record<string, unknown> | null;
}
