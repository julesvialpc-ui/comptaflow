import { QuoteStatus } from '@prisma/client';

export class CreateQuoteItemDto {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate?: number;
}

export class CreateQuoteDto {
  clientId?: string;
  status?: QuoteStatus;
  issueDate?: Date;
  expiryDate?: Date;
  vatRate?: number;
  notes?: string;
  items: CreateQuoteItemDto[];
}
