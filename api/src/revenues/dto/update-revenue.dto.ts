import { RevenueCategory, RecurrenceInterval } from '@prisma/client';

export class UpdateRevenueDto {
  category?: RevenueCategory;
  amount?: number;
  vatAmount?: number;
  description?: string;
  date?: Date;
  clientName?: string;
  isRecurring?: boolean;
  recurrenceInterval?: RecurrenceInterval;
  userCategoryId?: string | null;
}
