import { ContractType } from '@prisma/client';

export class UpdateEmployeeDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  position?: string;
  contractType?: ContractType;
  grossSalary?: number;
  startDate?: string;
  endDate?: string | null;
  socialSecurityNumber?: string;
  iban?: string;
  isActive?: boolean;
  notes?: string;
}
