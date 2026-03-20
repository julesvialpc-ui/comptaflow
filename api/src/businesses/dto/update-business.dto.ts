import { BusinessType } from '@prisma/client';

export class UpdateBusinessDto {
  name?: string;
  siret?: string;
  siren?: string;
  vatNumber?: string;
  type?: BusinessType;
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
}
