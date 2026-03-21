import { Injectable, NotFoundException } from '@nestjs/common';
import { QuoteStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  // ── List ──────────────────────────────────────────────────────────────────

  findAll(
    businessId: string,
    filters: { status?: QuoteStatus; clientId?: string; search?: string } = {},
  ) {
    return this.prisma.quote.findMany({
      where: {
        businessId,
        ...(filters.status && { status: filters.status }),
        ...(filters.clientId && { clientId: filters.clientId }),
        ...(filters.search && {
          OR: [
            { number: { contains: filters.search, mode: 'insensitive' as const } },
            { client: { name: { contains: filters.search, mode: 'insensitive' as const } } },
          ],
        }),
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
        items: true,
      },
      orderBy: { issueDate: 'desc' },
    });
  }

  // ── Single ────────────────────────────────────────────────────────────────

  async findOne(id: string, businessId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, businessId },
      include: {
        client: true,
        items: true,
        business: true,
      },
    });
    if (!quote) throw new NotFoundException(`Quote ${id} not found`);
    return quote;
  }

  // ── Auto-number ───────────────────────────────────────────────────────────

  async generateNumber(businessId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.quote.count({
      where: { businessId, number: { startsWith: `DEV-${year}-` } },
    });
    return `DEV-${year}-${String(count + 1).padStart(3, '0')}`;
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async create(dto: CreateQuoteDto, businessId: string) {
    const { items, ...quoteData } = dto;
    const number = await this.generateNumber(businessId);
    const vatRate = quoteData.vatRate ?? 0;
    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;

    return this.prisma.quote.create({
      data: {
        ...quoteData,
        number,
        businessId,
        subtotal,
        vatAmount,
        total,
        items: {
          create: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            vatRate: item.vatRate ?? 0,
            total: item.quantity * item.unitPrice * (1 + (item.vatRate ?? 0) / 100),
          })),
        },
      },
      include: { client: true, items: true },
    });
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: string, businessId: string, dto: UpdateQuoteDto) {
    await this.findOne(id, businessId);
    const { items, ...quoteData } = dto;

    let totals = {};
    if (items) {
      const vatRate = quoteData.vatRate ?? 0;
      const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      const vatAmount = subtotal * (vatRate / 100);
      totals = { subtotal, vatAmount, total: subtotal + vatAmount };
    }

    return this.prisma.quote.update({
      where: { id },
      data: {
        ...quoteData,
        ...totals,
        ...(items && {
          items: {
            deleteMany: {},
            create: items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              vatRate: item.vatRate ?? 0,
              total: item.quantity * item.unitPrice * (1 + (item.vatRate ?? 0) / 100),
            })),
          },
        }),
      },
      include: { client: true, items: true },
    });
  }

  // ── Remove ────────────────────────────────────────────────────────────────

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    return this.prisma.quote.delete({ where: { id } });
  }

  // ── Convert to Invoice ────────────────────────────────────────────────────

  async convertToInvoice(id: string, businessId: string) {
    const quote = await this.findOne(id, businessId);

    // Generate invoice number
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count({
      where: { businessId, number: { startsWith: `FAC-${year}-` } },
    });
    const invoiceNumber = `FAC-${year}-${String(count + 1).padStart(4, '0')}`;

    const invoice = await this.prisma.invoice.create({
      data: {
        businessId,
        clientId: quote.clientId,
        number: invoiceNumber,
        status: 'DRAFT',
        issueDate: new Date(),
        subtotal: quote.subtotal,
        vatRate: quote.vatRate,
        vatAmount: quote.vatAmount,
        total: quote.total,
        notes: quote.notes,
        items: {
          create: quote.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            vatRate: item.vatRate,
            total: item.total,
          })),
        },
      },
      include: { client: true, items: true },
    });

    // Update quote status
    await this.prisma.quote.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        convertedInvoiceId: invoice.id,
      },
    });

    return invoice;
  }
}
