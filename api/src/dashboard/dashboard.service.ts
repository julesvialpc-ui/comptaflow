import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ─── Built-in color maps ──────────────────────────────────────────────────────

const EXPENSE_COLORS: Record<string, string> = {
  OFFICE_SUPPLIES:   '#378ADD',
  TRAVEL:            '#FAC775',
  MEALS:             '#F4C0D1',
  EQUIPMENT:         '#185FA5',
  SOFTWARE:          '#9FE1CB',
  MARKETING:         '#D3D1C7',
  PROFESSIONAL_FEES: '#B5D4F4',
  RENT:              '#EAF3DE',
  UTILITIES:         '#888780',
  INSURANCE:         '#F0F9EC',
  TAXES:             '#FECACA',
  SALARY:            '#DCF5E6',
  OTHER:             '#E5E4E0',
};

const REVENUE_COLORS: Record<string, string> = {
  SERVICES:     '#378ADD',
  PRODUCTS:     '#185FA5',
  CONSULTING:   '#9FE1CB',
  FREELANCE:    '#3B6D11',
  SUBSCRIPTION: '#FAC775',
  RENTAL:       '#B5D4F4',
  OTHER:        '#D3D1C7',
};

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
      currentMonthRevenues,
      lastMonthRevenues,
      yearRevenues,
      invoiceStatusCounts,
      allExpenses,
      allRevenues,
      recentInvoices,
      taxDeadlines,
      monthlyData,
      userCategories,
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
      // Revenues table current month
      this.prisma.revenue.aggregate({
        where: { businessId, date: { gte: currentMonthStart } },
        _sum: { amount: true },
      }),
      // Revenues table last month
      this.prisma.revenue.aggregate({
        where: { businessId, date: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { amount: true },
      }),
      // Revenues table this year
      this.prisma.revenue.aggregate({
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
      // All year revenues by category
      this.prisma.revenue.groupBy({
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
      // User categories for color lookup
      this.prisma.userCategory.findMany({ where: { businessId } }),
    ]);

    // ─── KPIs ──────────────────────────────────────────────────────────────

    const curRevenue = (currentMonthInvoices._sum.total ?? 0) + (currentMonthRevenues._sum.amount ?? 0);
    const lastRevenue = (lastMonthInvoices._sum.total ?? 0) + (lastMonthRevenues._sum.amount ?? 0);
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

    // ─── Color lookup helpers ──────────────────────────────────────────────

    const expenseCatMap = new Map(userCategories.filter(c => c.type === 'EXPENSE').map(c => [c.slug, c.color]));
    const revenueCatMap = new Map(userCategories.filter(c => c.type === 'REVENUE').map(c => [c.slug, c.color]));

    // ─── Expense breakdown ─────────────────────────────────────────────────

    const yearExpensesTotal = yearExpenses._sum.amount ?? 0;
    const expenseBreakdown = allExpenses.map((e) => {
      const catSlug = e.category.toLowerCase();
      const color = expenseCatMap.get(catSlug) ?? EXPENSE_COLORS[e.category] ?? '#E5E4E0';
      return {
        category: e.category,
        amount: e._sum.amount ?? 0,
        percentage:
          yearExpensesTotal > 0
            ? Math.round(((e._sum.amount ?? 0) / yearExpensesTotal) * 100)
            : 0,
        color,
      };
    });

    const yearRevenuesTotal = (yearInvoices._sum.total ?? 0) + (yearRevenues._sum.amount ?? 0);
    const revenueBreakdown = allRevenues.map((r) => {
      const catSlug = r.category.toLowerCase();
      const color = revenueCatMap.get(catSlug) ?? REVENUE_COLORS[r.category] ?? '#D3D1C7';
      return {
        category: r.category,
        amount: r._sum.amount ?? 0,
        percentage:
          yearRevenuesTotal > 0
            ? Math.round(((r._sum.amount ?? 0) / yearRevenuesTotal) * 100)
            : 0,
        color,
      };
    });

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
    const yearRevenue = yearRevenuesTotal;
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
      revenueBreakdown,
      monthlyRevenue: monthlyData,
      threshold: {
        yearRevenue,
        limit: MICRO_THRESHOLD_SERVICES,
        progress: thresholdProgress,
        isNearLimit: thresholdProgress >= 80,
      },
    };
  }

  // ─── URSSAF ────────────────────────────────────────────────────────────────

  async getUrssaf(businessId: string) {
    const URSSAF_RATE = 0.212;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    // Current quarter (0-indexed: 0=Q1, 1=Q2, 2=Q3, 3=Q4)
    const currentQ = Math.floor(month / 3);

    const getQuarterDates = (y: number, q: number) => {
      const startMonth = q * 3;
      const start = new Date(y, startMonth, 1);
      const end = new Date(y, startMonth + 3, 0, 23, 59, 59);
      return { start, end };
    };

    const quarterLabel = (y: number, q: number) => {
      const months = [
        ['Janvier', 'Mars'],
        ['Avril', 'Juin'],
        ['Juillet', 'Septembre'],
        ['Octobre', 'Décembre'],
      ];
      return `${months[q][0]} — ${months[q][1]} ${y}`;
    };

    const declarationDeadline = (y: number, q: number): Date => {
      // Q1→April 30, Q2→July 31, Q3→October 31, Q4→January 31 next year
      const deadlines = [
        new Date(y, 3, 30),   // April 30
        new Date(y, 6, 31),   // July 31
        new Date(y, 9, 31),   // October 31
        new Date(y + 1, 0, 31), // January 31 next year
      ];
      return deadlines[q];
    };

    // Fetch revenue for current quarter + previous 3 quarters
    const quarters: { year: number; quarter: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      let q = currentQ - i;
      let y = year;
      while (q < 0) { q += 4; y -= 1; }
      quarters.push({ year: y, quarter: q });
    }

    const revenuePromises = quarters.map(({ year: y, quarter: q }) => {
      const { start, end } = getQuarterDates(y, q);
      return Promise.all([
        this.prisma.invoice.aggregate({
          where: { businessId, status: 'PAID', paidAt: { gte: start, lte: end } },
          _sum: { total: true },
        }),
        this.prisma.revenue.aggregate({
          where: { businessId, date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ]);
    });

    const results = await Promise.all(revenuePromises);

    const quartersData = quarters.map(({ year: y, quarter: q }, i) => {
      const [inv, rev] = results[i];
      const revenue = (inv._sum.total ?? 0) + (rev._sum.amount ?? 0);
      const qNum = q + 1;
      return {
        quarter: `Q${qNum}` as string,
        label: quarterLabel(y, q),
        revenue,
        urssafEstimate: Math.round(revenue * URSSAF_RATE * 100) / 100,
      };
    });

    const currentQData = quartersData[3]; // last item is current quarter
    const previousQuarters = quartersData.slice(0, 3);

    const deadline = declarationDeadline(year, currentQ);
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      currentQuarterRevenue: currentQData.revenue,
      urssafEstimate: currentQData.urssafEstimate,
      quarter: currentQData.quarter,
      periodLabel: currentQData.label,
      declarationDeadline: deadline.toISOString().slice(0, 10),
      daysUntilDeadline,
      previousQuarters,
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
