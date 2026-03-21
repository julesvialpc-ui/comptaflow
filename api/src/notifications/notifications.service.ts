import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async findOne(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw new NotFoundException(`Notification ${id} not found`);
    return notification;
  }

  create(dto: CreateNotificationDto, userId: string) {
    return this.prisma.notification.create({
      data: { ...dto, userId, metadata: dto.metadata as object },
    });
  }

  async markAsRead(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async update(id: string, userId: string, dto: UpdateNotificationDto) {
    await this.findOne(id, userId);
    return this.prisma.notification.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.notification.delete({ where: { id } });
  }

  markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // ── Generate notifications based on current state ───────────────────────

  async generate(userId: string, businessId: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const created: string[] = [];

    // Helper: check if notification of same type already exists recently
    const hasRecent = async (type: string, extra?: string) => {
      const where: Record<string, unknown> = {
        userId,
        type: type as never,
        isRead: false,
        createdAt: { gte: sevenDaysAgo },
      };
      const count = await this.prisma.notification.count({ where });
      return count > 0;
    };

    // 1. Overdue invoices
    if (businessId) {
      const overdueInvoices = await this.prisma.invoice.findMany({
        where: { businessId, status: 'OVERDUE' },
        include: { client: { select: { name: true } } },
        take: 5,
      });

      for (const inv of overdueInvoices) {
        if (!(await hasRecent('INVOICE_OVERDUE'))) {
          await this.prisma.notification.create({
            data: {
              userId,
              type: 'INVOICE_OVERDUE',
              title: 'Facture en retard',
              message: `La facture ${inv.number}${inv.client ? ` (${inv.client.name})` : ''} est en retard de paiement.`,
              link: `/invoices/${inv.id}`,
            },
          });
          created.push(inv.id);
          break; // one per generate call
        }
      }

      // 2. URSSAF deadline < 7 days
      const upcomingTax = await this.prisma.taxReport.findFirst({
        where: {
          businessId,
          type: 'URSSAF',
          status: { in: ['DRAFT', 'SUBMITTED'] },
          dueDate: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
        },
      });

      if (upcomingTax && !(await hasRecent('URSSAF_DEADLINE'))) {
        await this.prisma.notification.create({
          data: {
            userId,
            type: 'URSSAF_DEADLINE',
            title: 'Echéance URSSAF proche',
            message: `Votre déclaration URSSAF est due le ${upcomingTax.dueDate?.toLocaleDateString('fr-FR')}.`,
            link: '/tax-reports',
          },
        });
      }

      // 3. Budget exceeded
      const budgets = await this.prisma.categoryBudget.findMany({ where: { businessId } });
      if (budgets.length > 0) {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const expenses = await this.prisma.expense.groupBy({
          by: ['category'],
          where: { businessId, date: { gte: monthStart, lte: monthEnd } },
          _sum: { amount: true },
        });
        const expenseMap = new Map(expenses.map((e) => [e.category as string, e._sum.amount ?? 0]));

        for (const budget of budgets) {
          const spent = expenseMap.get(budget.category) ?? 0;
          const pct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
          if (pct >= 90 && !(await hasRecent('BUDGET_EXCEEDED'))) {
            await this.prisma.notification.create({
              data: {
                userId,
                type: 'BUDGET_EXCEEDED',
                title: 'Budget dépassé',
                message: `Le budget "${budget.category}" est à ${Math.round(pct)}% (${Math.round(spent)}€ / ${budget.amount}€).`,
                link: '/settings',
              },
            });
            break;
          }
        }
      }

      // 4. Threshold warning (>80% of micro-entrepreneur limit)
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const [yearInv, yearRev] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: { businessId, status: 'PAID', paidAt: { gte: yearStart } },
          _sum: { total: true },
        }),
        this.prisma.revenue.aggregate({
          where: { businessId, date: { gte: yearStart } },
          _sum: { amount: true },
        }),
      ]);
      const yearRevenue = (yearInv._sum.total ?? 0) + (yearRev._sum.amount ?? 0);
      const threshold = 77700;
      if (yearRevenue / threshold >= 0.8 && !(await hasRecent('THRESHOLD_WARNING'))) {
        await this.prisma.notification.create({
          data: {
            userId,
            type: 'THRESHOLD_WARNING',
            title: 'Seuil micro-entreprise',
            message: `Votre CA annuel atteint ${Math.round((yearRevenue / threshold) * 100)}% du seuil de ${threshold}€.`,
            link: '/dashboard',
          },
        });
      }
    }

    return { generated: created.length > 0 || true };
  }
}
