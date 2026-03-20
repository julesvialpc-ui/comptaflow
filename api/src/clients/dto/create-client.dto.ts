export class CreateClientDto {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  siret?: string;
  vatNumber?: string;
  notes?: string;
}
