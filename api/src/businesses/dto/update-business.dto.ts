import { BusinessType, ActivityType } from '@prisma/client';

export class UpdateBusinessDto {
  name?: string;
  siret?: string;
  siren?: string;
  vatNumber?: string;
  type?: BusinessType;
  activityType?: ActivityType;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  iban?: string;
  bic?: string;
  revenueGoal?: number;
  isVatSubject?: boolean;
  defaultVatRate?: number;
  hasEmployees?: boolean;
}
