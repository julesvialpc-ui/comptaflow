export class UpdateTransactionDto {
  amount?: number;
  description?: string;
  date?: Date;
  category?: string;
  reference?: string;
  bankAccount?: string;
  isReconciled?: boolean;
}
