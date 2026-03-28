import { Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

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
      include: {
        userCategory: { select: { name: true, color: true } },
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
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
    const { userCategoryId, employeeId, ...rest } = dto;
    return this.prisma.expense.create({
      data: {
        ...rest,
        date,
        businessId,
        ...(userCategoryId ? { userCategoryId } : {}),
        ...(employeeId ? { employeeId } : {}),
      },
      include: {
        userCategory: { select: { name: true, color: true } },
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
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

  // ── Analyze receipt with Claude vision ────────────────────────────────────

  async analyzeReceipt(file: Express.Multer.File) {
    // Persist file to disk
    const ext = (file.originalname.split('.').pop() ?? 'jpg').toLowerCase();
    const filename = `${randomUUID()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'uploads', 'receipts');
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
    const receiptUrl = `/uploads/receipts/${filename}`;

    // Determine media type for Claude
    const mime = file.mimetype.startsWith('image/') ? file.mimetype : 'image/jpeg';
    const mediaType = mime as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
    const base64 = file.buffer.toString('base64');

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let extracted: Record<string, unknown> = {};
    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `Analyse ce ticket de caisse ou cette facture et extrais les informations. Réponds UNIQUEMENT avec ce JSON brut (sans markdown):
{
  "supplier": "nom du commerçant ou fournisseur",
  "date": "YYYY-MM-DD",
  "amountTTC": montant_total_TTC_en_nombre,
  "vatAmount": montant_TVA_en_nombre_ou_0,
  "category": "MEALS|TRAVEL|OFFICE_SUPPLIES|EQUIPMENT|SOFTWARE|MARKETING|PROFESSIONAL_FEES|RENT|UTILITIES|INSURANCE|TAXES|SALARY|OTHER",
  "description": "description courte en français"
}`,
            },
          ],
        }],
      });
      const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) extracted = JSON.parse(match[0]);
    } catch (_) {
      // Return receipt URL even if AI analysis fails
    }

    return { receiptUrl, ...extracted };
  }
}
