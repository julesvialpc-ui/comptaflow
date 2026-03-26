import { ContractType } from '@prisma/client';

export class CreateEmployeeDto {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  position?: string;
  contractType?: ContractType;
  grossSalary: number;
  startDate: string;
  endDate?: string;
  socialSecurityNumber?: string;
  iban?: string;
  notes?: string;
}
