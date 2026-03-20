import { ExpenseCategory } from '@prisma/client';

export class CreateExpenseDto {
  category?: ExpenseCategory;
  amount: number;
  vatAmount?: number;
  description?: string;
  date?: Date;
  receiptUrl?: string;
  supplier?: string;
  isDeductible?: boolean;
}
