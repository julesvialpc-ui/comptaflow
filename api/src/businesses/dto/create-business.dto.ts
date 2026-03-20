import { BusinessType } from '@prisma/client';

export class CreateBusinessDto {
  userId: string;
  name: string;
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
