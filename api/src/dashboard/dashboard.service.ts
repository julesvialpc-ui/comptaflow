import { Injectable } from '@nestjs/common';
import { BusinessType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// ─── Taux par statut juridique (2026) ────────────────────────────────────────

// Sources : urssaf.fr, autoentrepreneur.urssaf.fr — taux en vigueur au 01/01/2026
// Pour auto-entrepreneur/EI/EIRL : taux sur CA selon ActivityType (régime micro)
// Pour EURL/SARL (TNS) et SAS/SASU (assimilé salarié) : estimation sur CA
import { ActivityType } from '@prisma/client';

const ACTIVITY_TYPE_RATES: Record<ActivityType, number> = {
  BIC_VENTE:    0.123,  // Vente de marchandises — 12,3 %
  BIC_SERVICES: 0.212,  // Prestations de services — 21,2 %
  BNC:          0.256,  // Activités libérales hors CIPAV — 25,6 % (hausse 2026)
  BNC_CIPAV:    0.232,  // Activités libérales CIPAV — 23,2 %
};

// Taux pour les statuts sociétaires (estimation sur CA)
const COMPANY_URSSAF_RATES: Record<BusinessType, number> = {
  AUTO_ENTREPRENEUR: 0.212,  // fallback si activityType absent
  EI:    0.212,
  EIRL:  0.212,
  EURL:  0.45,   // gérant TNS majoritaire ~40-45 % rémunération
  SARL:  0.45,   // gérant TNS majoritaire
  SAS:   0.45,   // assimilé salarié ~45 % brut
  SASU:  0.45,
  SA:    0.45,
  OTHER: 0.212,
};

const MICRO_TYPES: BusinessType[] = ['AUTO_ENTREPRENEUR', 'EI', 'EIRL'];

function getUrssafRate(type: BusinessType, activityType?: ActivityType | null): number {
  if (MICRO_TYPES.includes(type) && activityType) {
    return ACTIVITY_TYPE_RATES[activityType];
  }
  return COMPANY_URSSAF_RATES[type];
}

// Abattement forfaitaire IR (régime micro)
const ABATEMENT_RATES: Record<BusinessType, number> = {
  AUTO_ENTREPRENEUR: 0.34,  // BNC
  EI:    0.34,
  EIRL:  0.34,
  EURL:  0.34,
  SARL:  0.34,
  SAS:   0.34,
  SASU:  0.34,
  SA:    0.34,
  OTHER: 0.34,
};

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

    // ─── Previous year (Feature 5) ─────────────────────────────────────────
    const prevYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const prevYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);

    const [prevYearInvoices, prevYearExpenses, prevYearRevenues] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { businessId, status: 'PAID', paidAt: { gte: prevYearStart, lte: prevYearEnd } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: { businessId, date: { gte: prevYearStart, lte: prevYearEnd } },
        _sum: { amount: true },
      }),
      this.prisma.revenue.aggregate({
        where: { businessId, date: { gte: prevYearStart, lte: prevYearEnd } },
        _sum: { amount: true },
      }),
    ]);

    const prevRevenue = (prevYearInvoices._sum.total ?? 0) + (prevYearRevenues._sum.amount ?? 0);
    const prevExpensesTotal = prevYearExpenses._sum.amount ?? 0;
    const prevProfit = prevRevenue - prevExpensesTotal;
    const yearGrowth = prevRevenue > 0 ? Math.round(((yearRevenue - prevRevenue) / prevRevenue) * 100) : null;

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
        previousYear: {
          revenue: prevRevenue,
          expenses: prevExpensesTotal,
          profit: prevProfit,
          invoiceCount: prevYearInvoices._count,
        },
        yearGrowth,
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
    const business = await this.prisma.business.findUnique({ where: { id: businessId }, select: { type: true, activityType: true } });
    const URSSAF_RATE = getUrssafRate(business?.type ?? 'AUTO_ENTREPRENEUR', business?.activityType);
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
      urssafRate: URSSAF_RATE,
      businessType: business?.type ?? 'AUTO_ENTREPRENEUR',
      activityType: business?.activityType ?? null,
    };
  }

  // ─── Forecast (Feature 6) ──────────────────────────────────────────────

  async getForecast(businessId: string) {
    const now = new Date();

    // Get last 3 months revenue and expenses
    const months: { revenue: number; expenses: number }[] = [];
    for (let i = 3; i >= 1; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const [inv, rev, exp] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: { businessId, status: 'PAID', paidAt: { gte: start, lte: end } },
          _sum: { total: true },
        }),
        this.prisma.revenue.aggregate({
          where: { businessId, date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        this.prisma.expense.aggregate({
          where: { businessId, date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ]);

      months.push({
        revenue: (inv._sum.total ?? 0) + (rev._sum.amount ?? 0),
        expenses: exp._sum.amount ?? 0,
      });
    }

    const avgRevenue = months.reduce((s, m) => s + m.revenue, 0) / 3;
    const avgExpenses = months.reduce((s, m) => s + m.expenses, 0) / 3;

    // Get recurring amounts
    const [recurringRevenues, recurringExpenses] = await Promise.all([
      this.prisma.revenue.aggregate({
        where: { businessId, isRecurring: true },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { businessId, isRecurring: true },
        _sum: { amount: true },
      }),
    ]);

    const recurringRev = recurringRevenues._sum.amount ?? 0;
    const recurringExp = recurringExpenses._sum.amount ?? 0;

    const forecast: { month: string; projectedRevenue: number; projectedExpenses: number; projectedProfit: number }[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const projectedRevenue = Math.round((avgRevenue + recurringRev) * 100) / 100;
      const projectedExpenses = Math.round((avgExpenses + recurringExp) * 100) / 100;
      forecast.push({
        month,
        projectedRevenue,
        projectedExpenses,
        projectedProfit: Math.round((projectedRevenue - projectedExpenses) * 100) / 100,
      });
    }

    return forecast;
  }

  // ─── IR Estimate (Feature 7) ──────────────────────────────────────────

  async getIrEstimate(businessId: string) {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [business, invoices, revenues] = await Promise.all([
      this.prisma.business.findUnique({ where: { id: businessId }, select: { type: true, activityType: true } }),
      this.prisma.invoice.aggregate({
        where: { businessId, status: 'PAID', paidAt: { gte: yearStart } },
        _sum: { total: true },
      }),
      this.prisma.revenue.aggregate({
        where: { businessId, date: { gte: yearStart } },
        _sum: { amount: true },
      }),
    ]);

    const businessType = business?.type ?? 'AUTO_ENTREPRENEUR';
    const yearRevenue = (invoices._sum.total ?? 0) + (revenues._sum.amount ?? 0);
    const abatement = ABATEMENT_RATES[businessType];
    const taxableIncome = yearRevenue * (1 - abatement);
    const irEstimate = Math.round(taxableIncome * 0.22 * 100) / 100;
    const urssafRate = getUrssafRate(businessType, business?.activityType);
    const urssafDeductible = Math.round(yearRevenue * urssafRate * 100) / 100;
    const netAfterTax = Math.round((yearRevenue - irEstimate - urssafDeductible) * 100) / 100;

    return {
      yearRevenue: Math.round(yearRevenue * 100) / 100,
      activityType: 'SERVICES',
      abatement: abatement * 100,
      taxableIncome: Math.round(taxableIncome * 100) / 100,
      irEstimate,
      urssafDeductible,
      netAfterTax,
      urssafRate: urssafRate * 100,
      businessType,
      disclaimer: 'Estimation indicative. Consultez un expert-comptable pour votre situation personnelle.',
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
