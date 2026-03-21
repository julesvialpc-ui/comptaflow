export class CreateTimeEntryDto {
  clientId?: string;
  description: string;
  date: Date;
  hours: number;
  hourlyRate: number;
}
