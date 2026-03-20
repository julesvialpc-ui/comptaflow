import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(businessId: string) {
    const now = new Date();

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [
      currentMonthInvoices,
      lastMonthInvoices,
      yearInvoices,
      currentMonthExpenses,
      lastMonthExpenses,
      yearExpenses,
      invoiceStatusCounts,
      allExpenses,
      recentInvoices,
      taxDeadlines,
      monthlyData,
    ] = await Promise.all([
      // Revenue: paid invoices current month
      this.prisma.invoice.aggregate({
        where: { businessId, status: 'PAID', paidAt: { gte: currentMonthStart } },
        _sum: { total: true },
        _count: true,
      }),
      // Revenue: paid invoices last month
      this.prisma.invoice.aggregate({
        where: { businessId, status: 'PAID', paidAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { total: true },
      }),
      // Revenue: paid invoices this year
      this.prisma.invoice.aggregate({
        where: { businessId, status: 'PAID', paidAt: { gte: yearStart } },
        _sum: { total: true },
        _count: true,
      }),
      // Expenses current month
      this.prisma.expense.aggregate({
        where: { businessId, date: { gte: currentMonthStart } },
        _sum: { amount: true },
      }),
      // Expenses last month
      this.prisma.expense.aggregate({
        where: { businessId, date: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { amount: true },
      }),
      // Expenses this year
      this.prisma.expense.aggregate({
        where: { businessId, date: { gte: yearStart } },
        _sum: { amount: true },
      }),
      // Invoice counts by status
      this.prisma.invoice.groupBy({
        by: ['status'],
        where: { businessId },
        _count: true,
        _sum: { total: true },
      }),
      // All year expenses by category
      this.prisma.expense.groupBy({
        by: ['category'],
        where: { businessId, date: { gte: yearStart } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      // 5 most recent invoices
      this.prisma.invoice.findMany({
        where: { businessId },
        include: { client: { select: { name: true } } },
        orderBy: { issueDate: 'desc' },
        take: 5,
      }),
      // Upcoming tax deadlines
      this.prisma.taxReport.findMany({
        where: { businessId, status: { in: ['DRAFT', 'SUBMITTED'] }, dueDate: { gte: now } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      // Last 12 months revenue + expenses
      this.getMonthlyData(businessId, twelveMonthsAgo, now),
    ]);

    // ─── KPIs ──────────────────────────────────────────────────────────────

    const curRevenue = currentMonthInvoices._sum.total ?? 0;
    const lastRevenue = lastMonthInvoices._sum.total ?? 0;
    const curExpenses = currentMonthExpenses._sum.amount ?? 0;
    const lastExpenses = lastMonthExpenses._sum.amount ?? 0;

    const revenueGrowth =
      lastRevenue > 0 ? Math.round(((curRevenue - lastRevenue) / lastRevenue) * 100) : null;
    const expensesGrowth =
      lastExpenses > 0 ? Math.round(((curExpenses - lastExpenses) / lastExpenses) * 100) : null;

    // ─── Invoice stats ─────────────────────────────────────────────────────

    const invoiceStats = Object.fromEntries(
      invoiceStatusCounts.map((g) => [
        g.status,
        { count: g._count, total: g._sum.total ?? 0 },
      ]),
    );

    const unpaidTotal =
      (invoiceStats['SENT']?.total ?? 0) + (invoiceStats['OVERDUE']?.total ?? 0);
    const overdueTotal = invoiceStats['OVERDUE']?.total ?? 0;

    // ─── Expense breakdown ─────────────────────────────────────────────────

    const yearExpensesTotal = yearExpenses._sum.amount ?? 0;
    const expenseBreakdown = allExpenses.map((e) => ({
      category: e.category,
      amount: e._sum.amount ?? 0,
      percentage:
        yearExpensesTotal > 0
          ? Math.round(((e._sum.amount ?? 0) / yearExpensesTotal) * 100)
          : 0,
    }));

    // ─── Tax deadlines ─────────────────────────────────────────────────────

    const deadlines = taxDeadlines.map((t) => ({
      id: t.id,
      type: t.type,
      dueDate: t.dueDate,
      daysRemaining: t.dueDate
        ? Math.ceil((t.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null,
      amount: t.amount,
      status: t.status,
    }));

    // ─── Threshold alert (micro-enterprise 2024) ───────────────────────────

    const MICRO_THRESHOLD_SERVICES = 77700;
    const MICRO_THRESHOLD_GOODS = 188700;
    const yearRevenue = yearInvoices._sum.total ?? 0;
    const thresholdProgress = Math.min(Math.round((yearRevenue / MICRO_THRESHOLD_SERVICES) * 100), 100);

    return {
      kpis: {
        currentMonth: {
          revenue: curRevenue,
          expenses: curExpenses,
          profit: curRevenue - curExpenses,
          invoiceCount: currentMonthInvoices._count,
          revenueGrowth,
          expensesGrowth,
        },
        currentYear: {
          revenue: yearRevenue,
          expenses: yearExpensesTotal,
          profit: yearRevenue - yearExpensesTotal,
          invoiceCount: yearInvoices._count,
        },
      },
      invoiceStats,
      unpaidTotal,
      overdueTotal,
      recentInvoices: recentInvoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        client: inv.client?.name ?? '—',
        amount: inv.total,
        status: inv.status,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
      })),
      taxDeadlines: deadlines,
      expenseBreakdown,
      monthlyRevenue: monthlyData,
      threshold: {
        yearRevenue,
        limit: MICRO_THRESHOLD_SERVICES,
        progress: thresholdProgress,
        isNearLimit: thresholdProgress >= 80,
      },
    };
  }

  private async getMonthlyData(businessId: string, from: Date, to: Date) {
    const [invoices, expenses] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { businessId, status: 'PAID', paidAt: { gte: from, lte: to } },
        select: { total: true, paidAt: true },
      }),
      this.prisma.expense.findMany({
        where: { businessId, date: { gte: from, lte: to } },
        select: { amount: true, date: true },
      }),
    ]);

    // Build map of month → { revenue, expenses }
    const months: Record<string, { month: string; revenue: number; expenses: number }> = {};

    const getKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // Pre-fill last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(to.getFullYear(), to.getMonth() - i, 1);
      const key = getKey(d);
      months[key] = { month: key, revenue: 0, expenses: 0 };
    }

    invoices.forEach((inv) => {
      if (inv.paidAt) {
        const key = getKey(inv.paidAt);
        if (months[key]) months[key].revenue += inv.total;
      }
    });

    expenses.forEach((exp) => {
      const key = getKey(exp.date);
      if (months[key]) months[key].expenses += exp.amount;
    });

    return Object.values(months);
  }
}
