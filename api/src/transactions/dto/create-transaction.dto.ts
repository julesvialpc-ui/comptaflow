import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  invoiceId?: string;
  type: TransactionType;
  amount: number;
  description?: string;
  date?: Date;
  category?: string;
  reference?: string;
  bankAccount?: string;
}
