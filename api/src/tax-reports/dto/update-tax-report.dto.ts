import { TaxReportStatus } from '@prisma/client';

export class UpdateTaxReportDto {
  status?: TaxReportStatus;
  dueDate?: Date;
  submittedAt?: Date;
  amount?: number;
  details?: Record<string, unknown>;
  notes?: string;
}
