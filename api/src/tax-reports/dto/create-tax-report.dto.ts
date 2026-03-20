import { TaxReportType, TaxReportStatus } from '@prisma/client';

export class CreateTaxReportDto {
  type: TaxReportType;
  status?: TaxReportStatus;
  periodStart: Date;
  periodEnd: Date;
  dueDate?: Date;
  amount?: number;
  details?: Record<string, unknown>;
  notes?: string;
}
