import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryBudgetDto } from './dto/create-category-budget.dto';

@Injectable()
export class CategoryBudgetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(businessId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const budgets = await this.prisma.categoryBudget.findMany({
      where: { businessId },
      orderBy: { category: 'asc' },
    });

    // Get current month expenses grouped by category
    const expenses = await this.prisma.expense.groupBy({
      by: ['category'],
      where: { businessId, date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    });

    const expenseMap = new Map(expenses.map((e) => [e.category as string, e._sum.amount ?? 0]));

    return budgets.map((b) => ({
      ...b,
      currentSpend: expenseMap.get(b.category) ?? 0,
      percentage: b.amount > 0 ? Math.round(((expenseMap.get(b.category) ?? 0) / b.amount) * 100) : 0,
    }));
  }

  async upsert(dto: CreateCategoryBudgetDto, businessId: string) {
    const period = dto.period ?? 'MONTHLY';
    return this.prisma.categoryBudget.upsert({
      where: {
        businessId_category_period: {
          businessId,
          category: dto.category,
          period,
        },
      },
      update: { amount: dto.amount },
      create: {
        businessId,
        category: dto.category,
        amount: dto.amount,
        period,
      },
    });
  }

  async remove(id: string, businessId: string) {
    const budget = await this.prisma.categoryBudget.findFirst({ where: { id, businessId } });
    if (!budget) return null;
    return this.prisma.categoryBudget.delete({ where: { id } });
  }

  // Used by notifications: check which budgets are exceeded
  async getExceededBudgets(businessId: string) {
    const all = await this.findAll(businessId);
    return all.filter((b) => b.percentage >= 90);
  }
}
