import { Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  // ── List ──────────────────────────────────────────────────────────────────

  findAll(
    businessId: string,
    filters: {
      category?: ExpenseCategory;
      search?: string;
      from?: Date;
      to?: Date;
      deductible?: boolean;
    } = {},
  ) {
    return this.prisma.expense.findMany({
      where: {
        businessId,
        ...(filters.category && { category: filters.category }),
        ...(filters.deductible !== undefined && { isDeductible: filters.deductible }),
        ...(filters.search && {
          OR: [
            { description: { contains: filters.search, mode: 'insensitive' } },
            { supplier:    { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
        ...((filters.from || filters.to) && {
          date: {
            ...(filters.from && { gte: filters.from }),
            ...(filters.to   && { lte: filters.to   }),
          },
        }),
      },
      include: { userCategory: { select: { name: true, color: true } } },
      orderBy: { date: 'desc' },
    });
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async getStats(businessId: string, from?: Date, to?: Date) {
    const dateFilter = (from || to)
      ? { date: { ...(from && { gte: from }), ...(to && { lte: to }) } }
      : {};

    const [byCategory, totals] = await Promise.all([
      this.prisma.expense.groupBy({
        by: ['category'],
        where: { businessId, ...dateFilter },
        _sum: { amount: true, vatAmount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      this.prisma.expense.aggregate({
        where: { businessId, ...dateFilter },
        _sum: { amount: true, vatAmount: true },
        _count: { _all: true },
      }),
    ]);

    return {
      total:    totals._sum.amount    ?? 0,
      vatTotal: totals._sum.vatAmount ?? 0,
      count:    totals._count._all,
      byCategory: byCategory.map((g) => ({
        category:  g.category,
        amount:    g._sum.amount    ?? 0,
        vatAmount: g._sum.vatAmount ?? 0,
        count:     g._count._all,
      })),
    };
  }

  // ── Single ────────────────────────────────────────────────────────────────

  async findOne(id: string, businessId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, businessId },
      include: { userCategory: { select: { name: true, color: true } } },
    });
    if (!expense) throw new NotFoundException(`Expense ${id} not found`);
    return expense;
  }

  // ── Create ────────────────────────────────────────────────────────────────

  create(dto: CreateExpenseDto, businessId: string) {
    const date = dto.date ? new Date(dto.date as unknown as string) : new Date();
    const { userCategoryId, ...rest } = dto;
    return this.prisma.expense.create({
      data: {
        ...rest,
        date,
        businessId,
        ...(userCategoryId ? { userCategoryId } : {}),
      },
      include: { userCategory: { select: { name: true, color: true } } },
    });
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: string, businessId: string, dto: UpdateExpenseDto) {
    await this.findOne(id, businessId);
    return this.prisma.expense.update({
      where: { id },
      data: dto,
      include: { userCategory: { select: { name: true, color: true } } },
    });
  }

  // ── Remove ────────────────────────────────────────────────────────────────

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    return this.prisma.expense.delete({ where: { id } });
  }
}
