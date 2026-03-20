import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async findByUser(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!subscription) throw new NotFoundException(`Subscription for user ${userId} not found`);
    return subscription;
  }

  findAll() {
    return this.prisma.subscription.findMany({ include: { user: { select: { email: true } } } });
  }

  create(dto: CreateSubscriptionDto) {
    return this.prisma.subscription.create({ data: dto });
  }

  async update(userId: string, dto: UpdateSubscriptionDto) {
    await this.findByUser(userId);
    return this.prisma.subscription.update({ where: { userId }, data: dto });
  }
}
