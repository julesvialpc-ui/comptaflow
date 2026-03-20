import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  name?: string;
  avatarUrl?: string;
  role?: UserRole;
  isVerified?: boolean;
  refreshToken?: string;
  lastLoginAt?: Date;
}
