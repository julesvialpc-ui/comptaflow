import { InvoiceStatus } from '@prisma/client';
import { CreateInvoiceItemDto } from './create-invoice.dto';

export class UpdateInvoiceDto {
  clientId?: string;
  status?: InvoiceStatus;
  dueDate?: Date;
  paidAt?: Date;
  vatRate?: number;
  notes?: string;
  paymentTerms?: string;
  pdfUrl?: string;
  items?: CreateInvoiceItemDto[];
}
