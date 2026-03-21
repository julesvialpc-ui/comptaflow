import { InvoiceStatus, RecurrenceInterval } from '@prisma/client';

export class CreateInvoiceItemDto {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate?: number;
}

export class CreateInvoiceDto {
  clientId?: string;
  number: string;
  status?: InvoiceStatus;
  issueDate?: Date;
  dueDate?: Date;
  vatRate?: number;
  notes?: string;
  paymentTerms?: string;
  isRecurring?: boolean;
  recurrenceInterval?: RecurrenceInterval;
  items: CreateInvoiceItemDto[];
}
