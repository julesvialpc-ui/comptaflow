import { QuoteStatus } from '@prisma/client';

export class UpdateQuoteItemDto {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate?: number;
}

export class UpdateQuoteDto {
  clientId?: string;
  number?: string;
  status?: QuoteStatus;
  issueDate?: Date;
  expiryDate?: Date;
  vatRate?: number;
  notes?: string;
  items?: UpdateQuoteItemDto[];
}
