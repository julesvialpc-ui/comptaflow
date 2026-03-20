import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  findAll(businessId: string) {
    return this.prisma.transaction.findMany({
      where: { businessId },
      include: { invoice: { select: { number: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, businessId: string) {
    const transaction = await this.prisma.transaction.findFirst({ where: { id, businessId } });
    if (!transaction) throw new NotFoundException(`Transaction ${id} not found`);
    return transaction;
  }

  create(dto: CreateTransactionDto, businessId: string) {
    return this.prisma.transaction.create({ data: { ...dto, businessId } });
  }

  async update(id: string, businessId: string, dto: UpdateTransactionDto) {
    await this.findOne(id, businessId);
    return this.prisma.transaction.update({ where: { id }, data: dto });
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    return this.prisma.transaction.delete({ where: { id } });
  }
}
