import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';

@Injectable()
export class TimeEntriesService {
  constructor(private prisma: PrismaService) {}

  // ── List ──────────────────────────────────────────────────────────────────

  findAll(
    businessId: string,
    filters: { clientId?: string; startDate?: Date; endDate?: Date; isBilled?: boolean } = {},
  ) {
    return this.prisma.timeEntry.findMany({
      where: {
        businessId,
        ...(filters.clientId && { clientId: filters.clientId }),
        ...(filters.isBilled !== undefined && { isBilled: filters.isBilled }),
        ...((filters.startDate || filters.endDate) && {
          date: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate }),
          },
        }),
      },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async getStats(businessId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalAll, totalMonth, unbilled] = await Promise.all([
      this.prisma.timeEntry.aggregate({
        where: { businessId },
        _sum: { hours: true, total: true },
        _count: true,
      }),
      this.prisma.timeEntry.aggregate({
        where: { businessId, date: { gte: monthStart } },
        _sum: { hours: true, total: true },
      }),
      this.prisma.timeEntry.aggregate({
        where: { businessId, isBilled: false },
        _sum: { hours: true, total: true },
        _count: true,
      }),
    ]);

    return {
      totalHours: totalAll._sum.hours ?? 0,
      totalAmount: totalAll._sum.total ?? 0,
      totalCount: totalAll._count,
      monthHours: totalMonth._sum.hours ?? 0,
      monthAmount: totalMonth._sum.total ?? 0,
      unbilledHours: unbilled._sum.hours ?? 0,
      unbilledAmount: unbilled._sum.total ?? 0,
      unbilledCount: unbilled._count,
    };
  }

  // ── Single ────────────────────────────────────────────────────────────────

  async findOne(id: string, businessId: string) {
    const entry = await this.prisma.timeEntry.findFirst({
      where: { id, businessId },
      include: { client: true },
    });
    if (!entry) throw new NotFoundException(`Time entry ${id} not found`);
    return entry;
  }

  // ── Create ────────────────────────────────────────────────────────────────

  create(dto: CreateTimeEntryDto, businessId: string) {
    const total = dto.hours * dto.hourlyRate;
    return this.prisma.timeEntry.create({
      data: {
        ...dto,
        businessId,
        total,
      },
      include: { client: { select: { id: true, name: true } } },
    });
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: string, businessId: string, dto: UpdateTimeEntryDto) {
    const existing = await this.findOne(id, businessId);
    const hours = dto.hours ?? existing.hours;
    const hourlyRate = dto.hourlyRate ?? existing.hourlyRate;
    const total = hours * hourlyRate;

    return this.prisma.timeEntry.update({
      where: { id },
      data: { ...dto, total },
      include: { client: { select: { id: true, name: true } } },
    });
  }

  // ── Remove ────────────────────────────────────────────────────────────────

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    return this.prisma.timeEntry.delete({ where: { id } });
  }

  // ── Generate Invoice from time entries ─────────────────────────────────────

  async generateInvoice(businessId: string, body: { clientId: string; timeEntryIds: string[] }) {
    const { clientId, timeEntryIds } = body;

    const entries = await this.prisma.timeEntry.findMany({
      where: { id: { in: timeEntryIds }, businessId, isBilled: false },
    });

    if (entries.length === 0) {
      throw new NotFoundException('No unbilled time entries found');
    }

    // Generate invoice number
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count({
      where: { businessId, number: { startsWith: `FAC-${year}-` } },
    });
    const invoiceNumber = `FAC-${year}-${String(count + 1).padStart(4, '0')}`;

    const subtotal = entries.reduce((sum, e) => sum + e.total, 0);

    const invoice = await this.prisma.invoice.create({
      data: {
        businessId,
        clientId,
        number: invoiceNumber,
        status: 'DRAFT',
        issueDate: new Date(),
        subtotal,
        vatRate: 0,
        vatAmount: 0,
        total: subtotal,
        items: {
          create: entries.map((e) => ({
            description: e.description,
            quantity: e.hours,
            unitPrice: e.hourlyRate,
            vatRate: 0,
            total: e.total,
          })),
        },
      },
      include: { client: true, items: true },
    });

    // Mark entries as billed
    await this.prisma.timeEntry.updateMany({
      where: { id: { in: timeEntryIds } },
      data: { isBilled: true, invoiceId: invoice.id },
    });

    return invoice;
  }
}
