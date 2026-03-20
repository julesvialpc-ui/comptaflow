import { UserRole } from '@prisma/client';

export class CreateUserDto {
  email: string;
  password: string;
  name?: string;
  avatarUrl?: string;
  role?: UserRole;
}
