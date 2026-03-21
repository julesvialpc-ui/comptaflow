export class CreateCategoryBudgetDto {
  category: string;
  amount: number;
  period?: string; // MONTHLY | YEARLY
}
