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

  // ── Remove ────────────────────────────────────────────────────────────────

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    return this.prisma.client.delete({ where: { id } });
  }
}
