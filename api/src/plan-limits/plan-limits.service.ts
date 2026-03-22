import { Injectable, ForbiddenException } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const PLAN_RANK: Record<SubscriptionPlan, number> = { FREE: 0, PRO: 1, BUSINESS: 2 };

export const FREE_LIMITS = {
  invoicesPerMonth: 5,
  clientsTotal: 10,
  quotesPerMonth: 5,
  aiMessagesPerMonth: 10,
};

@Injectable()
export class PlanLimitsService {
  constructor(private prisma: PrismaService) {}

  async getPlan(userId: string): Promise<SubscriptionPlan> {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub || sub.status !== 'ACTIVE') return 'FREE';
    return sub.plan;
  }

  async assertMinPlan(userId: string, minPlan: SubscriptionPlan) {
    const plan = await this.getPlan(userId);
    if (PLAN_RANK[plan] < PLAN_RANK[minPlan]) {
      throw new ForbiddenException({
        code: 'PLAN_UPGRADE_REQUIRED',
        requiredPlan: minPlan,
        currentPlan: plan,
        message: `Cette fonctionnalité nécessite le plan ${minPlan}.`,
      });
    }
  }

  async checkInvoiceLimit(userId: string, businessId: string) {
    const plan = await this.getPlan(userId);
    if (plan !== 'FREE') return;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const count = await this.prisma.invoice.count({
      where: { businessId, createdAt: { gte: monthStart } },
    });
    if (count >= FREE_LIMITS.invoicesPerMonth) {
      throw new ForbiddenException({
        code: 'PLAN_LIMIT_REACHED',
        resource: 'invoices',
        limit: FREE_LIMITS.invoicesPerMonth,
        current: count,
        message: `Limite de ${FREE_LIMITS.invoicesPerMonth} factures par mois atteinte.`,
      });
    }
  }

  async checkClientLimit(userId: string, businessId: string) {
    const plan = await this.getPlan(userId);
    if (plan !== 'FREE') return;
    const count = await this.prisma.client.count({ where: { businessId } });
    if (count >= FREE_LIMITS.clientsTotal) {
      throw new ForbiddenException({
        code: 'PLAN_LIMIT_REACHED',
        resource: 'clients',
        limit: FREE_LIMITS.clientsTotal,
        current: count,
        message: `Limite de ${FREE_LIMITS.clientsTotal} clients atteinte.`,
      });
    }
  }

  async checkQuoteLimit(userId: string, businessId: string) {
    const plan = await this.getPlan(userId);
    if (plan !== 'FREE') return;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const count = await this.prisma.quote.count({
      where: { businessId, createdAt: { gte: monthStart } },
    });
    if (count >= FREE_LIMITS.quotesPerMonth) {
      throw new ForbiddenException({
        code: 'PLAN_LIMIT_REACHED',
        resource: 'quotes',
        limit: FREE_LIMITS.quotesPerMonth,
        current: count,
        message: `Limite de ${FREE_LIMITS.quotesPerMonth} devis par mois atteinte.`,
      });
    }
  }

  async checkAiMessageLimit(userId: string) {
    const plan = await this.getPlan(userId);
    if (plan !== 'FREE') return;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const count = await this.prisma.chatMessage.count({
      where: { userId, role: 'user', createdAt: { gte: monthStart } },
    });
    if (count >= FREE_LIMITS.aiMessagesPerMonth) {
      throw new ForbiddenException({
        code: 'PLAN_LIMIT_REACHED',
        resource: 'aiMessages',
        limit: FREE_LIMITS.aiMessagesPerMonth,
        current: count,
        message: `Limite de ${FREE_LIMITS.aiMessagesPerMonth} messages IA par mois atteinte.`,
      });
    }
  }

  async getUsage(userId: string, businessId: string) {
    const plan = await this.getPlan(userId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [invoicesThisMonth, clientsTotal, quotesThisMonth, aiMessagesThisMonth] = await Promise.all([
      this.prisma.invoice.count({ where: { businessId, createdAt: { gte: monthStart } } }),
      this.prisma.client.count({ where: { businessId } }),
      this.prisma.quote.count({ where: { businessId, createdAt: { gte: monthStart } } }),
      this.prisma.chatMessage.count({ where: { userId, role: 'user', createdAt: { gte: monthStart } } }),
    ]);
    return {
      plan,
      limits: plan === 'FREE' ? FREE_LIMITS : null,
      usage: { invoicesThisMonth, clientsTotal, quotesThisMonth, aiMessagesThisMonth },
    };
  }
}
