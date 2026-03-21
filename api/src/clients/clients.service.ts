import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  // ── List ──────────────────────────────────────────────────────────────────

  findAll(businessId: string, search?: string) {
    return this.prisma.client.findMany({
      where: {
        businessId,
        ...(search && {
          OR: [
            { name:  { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { siret: { contains: search, mode: 'insensitive' } },
            { city:  { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        _count: { select: { invoices: true } },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  // ── Single ────────────────────────────────────────────────────────────────

  async findOne(id: string, businessId: string) {
    const [client, revenue] = await Promise.all([
      this.prisma.client.findFirst({
        where: { id, businessId },
        include: {
          invoices: {
            orderBy: { issueDate: 'desc' },
            take: 10,
            select: {
              id: true,
              number: true,
              status: true,
              total: true,
              issueDate: true,
              dueDate: true,
            },
          },
          _count: { select: { invoices: true } },
        },
      }),
      this.prisma.invoice.aggregate({
        where: { clientId: id, businessId, status: 'PAID' },
        _sum: { total: true },
      }),
    ]);

    if (!client) throw new NotFoundException(`Client ${id} not found`);
    return { ...client, totalRevenue: revenue._sum.total ?? 0 };
  }

  // ── Create ────────────────────────────────────────────────────────────────

  create(dto: CreateClientDto, businessId: string) {
    return this.prisma.client.create({ data: { ...dto, businessId } });
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: string, businessId: string, dto: UpdateClientDto) {
    await this.findOne(id, businessId);
    return this.prisma.client.update({ where: { id }, data: dto });
  }

  // ── Toggle active ─────────────────────────────────────────────────────────

  async toggleActive(id: string, businessId: string) {
    const client = await this.findOne(id, businessId);
    return this.prisma.client.update({
      where: { id },
      data: { isActive: !client.isActive },
    });
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  async getStats(id: string, businessId: string) {
    const client = await this.prisma.client.findFirst({ where: { id, businessId } });
    if (!client) throw new NotFoundException(`Client ${id} not found`);

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [totalAgg, allInvoices, paidInvoices, pendingInvoices, monthlyData] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { clientId: id, businessId, status: 'PAID' },
        _sum: { total: true },
        _count: true,
        _max: { total: true },
      }),
      this.prisma.invoice.count({
        where: { clientId: id, businessId },
      }),
      this.prisma.invoice.findMany({
        where: { clientId: id, businessId, status: 'PAID' },
        select: { issueDate: true, paidAt: true, total: true },
      }),
      this.prisma.invoice.count({
        where: { clientId: id, businessId, status: { in: ['SENT', 'OVERDUE'] } },
      }),
      this.prisma.invoice.findMany({
        where: { clientId: id, businessId, status: 'PAID', paidAt: { gte: twelveMonthsAgo } },
        select: { total: true, paidAt: true },
      }),
    ]);

    // Average payment days
    let avgPaymentDays = 0;
    const paidWithDates = paidInvoices.filter((i) => i.paidAt);
    if (paidWithDates.length > 0) {
      const totalDays = paidWithDates.reduce((sum, i) => {
        const days = Math.ceil(
          (new Date(i.paidAt!).getTime() - new Date(i.issueDate).getTime()) / (1000 * 60 * 60 * 24),
        );
        return sum + Math.max(0, days);
      }, 0);
      avgPaymentDays = Math.round(totalDays / paidWithDates.length);
    }

    // Monthly revenue for last 12 months
    const months: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = 0;
    }
    monthlyData.forEach((inv) => {
      if (inv.paidAt) {
        const d = new Date(inv.paidAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (months[key] !== undefined) months[key] += inv.total;
      }
    });

    const lastPaid = paidInvoices.sort((a, b) =>
      (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0),
    )[0];

    return {
      totalRevenue: totalAgg._sum.total ?? 0,
      invoiceCount: allInvoices,
      paidCount: totalAgg._count,
      pendingCount: pendingInvoices,
      averagePaymentDays: avgPaymentDays,
      topInvoice: totalAgg._max.total ?? 0,
      monthlyRevenue: Object.entries(months).map(([month, revenue]) => ({ month, revenue })),
      lastInvoiceDate: lastPaid?.paidAt ?? null,
    };
  }

  // ── Remove ────────────────────────────────────────────────────────────────

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    return this.prisma.client.delete({ where: { id } });
  }
}
