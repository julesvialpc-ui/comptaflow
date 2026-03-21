import { RevenueCategory, RecurrenceInterval } from '@prisma/client';

export class CreateRevenueDto {
  category?: RevenueCategory;
  amount: number;
  vatAmount?: number;
  description?: string;
  date?: Date;
  clientName?: string;
  isRecurring?: boolean;
  recurrenceInterval?: RecurrenceInterval;
  userCategoryId?: string;
}
