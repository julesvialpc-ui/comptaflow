import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}
