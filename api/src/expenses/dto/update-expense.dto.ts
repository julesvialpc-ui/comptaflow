import { ExpenseCategory } from '@prisma/client';

export class UpdateExpenseDto {
  category?: ExpenseCategory;
  amount?: number;
  vatAmount?: number;
  description?: string;
  date?: Date;
  receiptUrl?: string;
  supplier?: string;
  isDeductible?: boolean;
}
