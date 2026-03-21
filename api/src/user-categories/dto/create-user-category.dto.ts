export class CreateUserCategoryDto {
  name: string;
  color?: string;
  type: string; // 'EXPENSE' | 'REVENUE'
}
