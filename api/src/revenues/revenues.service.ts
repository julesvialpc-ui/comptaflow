import { Injectable, NotFoundException } from '@nestjs/common';
import { RevenueCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { UpdateRevenueDto } from './dto/update-revenue.dto';

@Injectable()
export class RevenuesService {
  constructor(private prisma: PrismaService) {}

  findAll(
    businessId: string,
    filters: {
      category?: RevenueCategory;
      search?: string;
      from?: Date;
      to?: Date;
    } = {},
  ) {
    return this.prisma.revenue.findMany({
      where: {
        businessId,
        ...(filters.category && { category: filters.category }),
        ...(filters.search && {
          OR: [
            { description: { contains: filters.search, mode: 'insensitive' } },
            { clientName:   { contains: filters.search, mode: 'insensitive' } },
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

  async getStats(businessId: string, from?: Date, to?: Date) {
    const dateFilter = (from || to)
      ? { date: { ...(from && { gte: from }), ...(to && { lte: to }) } }
      : {};

    const [byCategory, totals] = await Promise.all([
      this.prisma.revenue.groupBy({
        by: ['category'],
        where: { businessId, ...dateFilter },
        _sum: { amount: true, vatAmount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      this.prisma.revenue.aggregate({
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

  async findOne(id: string, businessId: string) {
    const revenue = await this.prisma.revenue.findFirst({
      where: { id, businessId },
      include: { userCategory: { select: { name: true, color: true } } },
    });
    if (!revenue) throw new NotFoundException(`Revenue ${id} not found`);
    return revenue;
  }

  create(dto: CreateRevenueDto, businessId: string) {
    const date = dto.date ? new Date(dto.date as unknown as string) : new Date();
    const { userCategoryId, ...rest } = dto;
    return this.prisma.revenue.create({
      data: {
        ...rest,
        date,
        businessId,
        ...(userCategoryId ? { userCategoryId } : {}),
      },
      include: { userCategory: { select: { name: true, color: true } } },
    });
  }

  async update(id: string, businessId: string, dto: UpdateRevenueDto) {
    await this.findOne(id, businessId);
    return this.prisma.revenue.update({
      where: { id },
      data: dto,
      include: { userCategory: { select: { name: true, color: true } } },
    });
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    return this.prisma.revenue.delete({ where: { id } });
  }
}
