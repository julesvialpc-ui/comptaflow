import { Module } from '@nestjs/common';
import { CategoryBudgetsService } from './category-budgets.service';
import { CategoryBudgetsController } from './category-budgets.controller';

@Module({
  controllers: [CategoryBudgetsController],
  providers: [CategoryBudgetsService],
  exports: [CategoryBudgetsService],
})
export class CategoryBudgetsModule {}
