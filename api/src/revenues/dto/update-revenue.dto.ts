import { RevenueCategory } from '@prisma/client';

export class UpdateRevenueDto {
  category?: RevenueCategory;
  amount?: number;
  vatAmount?: number;
  description?: string;
  date?: Date;
  clientName?: string;
}
