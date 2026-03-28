import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { $Enums } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';
import { AI_CHAT_TOOLS } from './ai-chat.tools';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 16000;
const HISTORY_LIMIT = 40; // last 40 messages for context

@Injectable()
export class AiChatService {
  private readonly client: Anthropic;
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private prisma: PrismaService,
    private chatService: ChatService,
  ) {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  async sendMessage(userId: string, businessId: string | null, message: string): Promise<string> {
    await this.chatService.create({ role: 'user', content: message }, userId);

    const messages = await this.buildMessages(userId, message);
    const system = await this.buildSystemPrompt(userId, businessId);

    const response = await this.runAgentLoop(messages, system, businessId);
    const text = this.extractText(response);

    await this.chatService.create({ role: 'assistant', content: text }, userId);
    return text;
  }

  async streamMessage(userId: string, businessId: string | null, message: string, res: Response): Promise<void> {
    await this.chatService.create({ role: 'user', content: message }, userId);

    const messages = await this.buildMessages(userId, message);
    const system = await this.buildSystemPrompt(userId, businessId);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const fullText = await this.runStreamingAgentLoop(messages, system, businessId, res);

    await this.chatService.create({ role: 'assistant', content: fullText }, userId);

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  }

  // ─── Agent loop (non-streaming) ───────────────────────────────────────────

  private async runAgentLoop(
    messages: Anthropic.Beta.BetaMessageParam[],
    system: string,
    businessId: string | null,
  ): Promise<Anthropic.Beta.BetaMessage> {
    let response = await this.client.beta.messages.create({
      betas: ['compact-2026-01-12'],
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: 'adaptive' },
      system,
      tools: AI_CHAT_TOOLS,
      messages,
    });

    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use',
      );

      messages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.Beta.BetaToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (block) => ({
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: await this.executeTool(block.name, block.input as Record<string, unknown>, businessId),
        })),
      );

      messages.push({ role: 'user', content: toolResults });

      response = await this.client.beta.messages.create({
        betas: ['compact-2026-01-12'],
        model: MODEL,
        max_tokens: MAX_TOKENS,
        thinking: { type: 'adaptive' },
        system,
        tools: AI_CHAT_TOOLS,
        messages,
      });
    }

    return response;
  }

  // ─── Agent loop (streaming) ───────────────────────────────────────────────

  private async runStreamingAgentLoop(
    messages: Anthropic.Beta.BetaMessageParam[],
    system: string,
    businessId: string | null,
    res: Response,
  ): Promise<string> {
    let fullText = '';
    let continueLoop = true;

    while (continueLoop) {
      const stream = this.client.beta.messages.stream({
        betas: ['compact-2026-01-12'],
        model: MODEL,
        max_tokens: MAX_TOKENS,
        thinking: { type: 'adaptive' },
        system,
        tools: AI_CHAT_TOOLS,
        messages,
      } as Parameters<typeof this.client.beta.messages.stream>[0]);

      // Stream text deltas to client
      stream.on('text', (delta) => {
        fullText += delta;
        res.write(`data: ${JSON.stringify({ type: 'text', text: delta })}\n\n`);
      });

      const message = await stream.finalMessage();

      if (message.stop_reason === 'tool_use') {
        const toolUseBlocks = message.content.filter(
          (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use',
        );

        // Notify client that tool calls are running
        res.write(`data: ${JSON.stringify({ type: 'tool_calls', tools: toolUseBlocks.map(b => b.name) })}\n\n`);

        messages.push({ role: 'assistant', content: message.content });

        const toolResults: Anthropic.Beta.BetaToolResultBlockParam[] = await Promise.all(
          toolUseBlocks.map(async (block) => ({
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: await this.executeTool(block.name, block.input as Record<string, unknown>, businessId),
          })),
        );

        messages.push({ role: 'user', content: toolResults });
      } else {
        continueLoop = false;
      }
    }

    return fullText;
  }

  // ─── Tool executor ────────────────────────────────────────────────────────

  private async executeTool(
    name: string,
    input: Record<string, unknown>,
    businessId: string | null,
  ): Promise<string> {
    if (!businessId) return JSON.stringify({ error: 'Aucune entreprise associée' });

    try {
      switch (name) {
        case 'get_financial_summary':
          return this.getFinancialSummary(businessId, input.period as string);
        case 'get_recent_invoices':
          return this.getRecentInvoices(businessId, input.limit as number, input.status as string);
        case 'get_recent_expenses':
          return this.getRecentExpenses(businessId, input.limit as number, input.category as string);
        case 'get_tax_deadlines':
          return this.getTaxDeadlines(businessId);
        case 'get_unpaid_invoices_total':
          return this.getUnpaidInvoicesTotal(businessId);
        case 'get_clients_summary':
          return this.getClientsSummary(businessId, input.top as number);
        case 'get_employees_summary':
          return this.getEmployeesSummary(businessId);
        case 'get_revenue_goal_progress':
          return this.getRevenueGoalProgress(businessId);
        case 'create_expense':
          return this.createExpense(businessId, input);
        default:
          return JSON.stringify({ error: `Outil inconnu: ${name}` });
      }
    } catch (err) {
      this.logger.error(`Tool ${name} failed`, err);
      return JSON.stringify({ error: 'Erreur lors de la récupération des données' });
    }
  }

  // ─── Tool implementations ─────────────────────────────────────────────────

  private async getFinancialSummary(businessId: string, period: string): Promise<string> {
    const { start, end } = this.getPeriodRange(period);

    const [invoices, expenses] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { businessId, status: 'PAID', paidAt: { gte: start, lte: end } },
        select: { total: true },
      }),
      this.prisma.expense.findMany({
        where: { businessId, date: { gte: start, lte: end } },
        select: { amount: true, category: true },
      }),
    ]);

    const revenue = invoices.reduce((sum, i) => sum + i.total, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const expensesByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {});

    return JSON.stringify({
      period,
      revenue: revenue.toFixed(2),
      expenses: totalExpenses.toFixed(2),
      net_profit: (revenue - totalExpenses).toFixed(2),
      profit_margin: revenue > 0 ? `${((1 - totalExpenses / revenue) * 100).toFixed(1)}%` : 'N/A',
      expenses_by_category: expensesByCategory,
    });
  }

  private async getRecentInvoices(businessId: string, limit = 10, status?: string): Promise<string> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        businessId,
        ...(status && status !== 'all' ? { status: status as any } : {}),
      },
      include: { client: { select: { name: true } } },
      orderBy: { issueDate: 'desc' },
      take: Math.min(limit || 10, 50),
    });

    return JSON.stringify(
      invoices.map((inv) => ({
        number: inv.number,
        client: inv.client?.name ?? 'Client inconnu',
        amount: inv.total.toFixed(2),
        status: inv.status,
        issue_date: inv.issueDate.toISOString().split('T')[0],
        due_date: inv.dueDate?.toISOString().split('T')[0] ?? null,
        paid_at: inv.paidAt?.toISOString().split('T')[0] ?? null,
      })),
    );
  }

  private async getRecentExpenses(businessId: string, limit = 10, category?: string): Promise<string> {
    const expenses = await this.prisma.expense.findMany({
      where: {
        businessId,
        ...(category ? { category: category as any } : {}),
      },
      orderBy: { date: 'desc' },
      take: Math.min(limit || 10, 50),
    });

    return JSON.stringify(
      expenses.map((e) => ({
        description: e.description,
        amount: e.amount.toFixed(2),
        vat_amount: e.vatAmount.toFixed(2),
        category: e.category,
        supplier: e.supplier,
        date: e.date.toISOString().split('T')[0],
        is_deductible: e.isDeductible,
      })),
    );
  }

  private async getTaxDeadlines(businessId: string): Promise<string> {
    const upcoming = await this.prisma.taxReport.findMany({
      where: {
        businessId,
        status: { in: ['DRAFT', 'SUBMITTED'] },
        dueDate: { gte: new Date() },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    const today = new Date();
    return JSON.stringify(
      upcoming.map((r) => ({
        type: r.type,
        status: r.status,
        period: `${r.periodStart.toISOString().split('T')[0]} → ${r.periodEnd.toISOString().split('T')[0]}`,
        due_date: r.dueDate?.toISOString().split('T')[0] ?? null,
        days_remaining: r.dueDate
          ? Math.ceil((r.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null,
        amount: r.amount.toFixed(2),
      })),
    );
  }

  private async getUnpaidInvoicesTotal(businessId: string): Promise<string> {
    const unpaid = await this.prisma.invoice.findMany({
      where: { businessId, status: { in: ['SENT', 'OVERDUE'] } },
      select: { total: true, status: true, dueDate: true, number: true },
    });

    const total = unpaid.reduce((sum, i) => sum + i.total, 0);
    const overdue = unpaid.filter((i) => i.status === 'OVERDUE');

    return JSON.stringify({
      total_unpaid: total.toFixed(2),
      count: unpaid.length,
      overdue_count: overdue.length,
      overdue_amount: overdue.reduce((sum, i) => sum + i.total, 0).toFixed(2),
    });
  }

  private async getClientsSummary(businessId: string, top = 5): Promise<string> {
    const [clients, quotes] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['clientId'],
        where: { businessId, status: 'PAID' },
        _sum: { total: true },
        _count: { id: true },
        orderBy: { _sum: { total: 'desc' } },
        take: Math.min(top || 5, 20),
      }),
      this.prisma.quote.count({
        where: { businessId, status: { in: ['DRAFT', 'SENT'] } },
      }),
    ]);

    const clientIds = clients.map((c) => c.clientId).filter(Boolean) as string[];
    const clientNames = await this.prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true },
    });
    const nameMap = Object.fromEntries(clientNames.map((c) => [c.id, c.name]));

    return JSON.stringify({
      top_clients: clients.map((c) => ({
        name: nameMap[c.clientId ?? ''] ?? 'Client inconnu',
        total_revenue: (c._sum.total ?? 0).toFixed(2),
        invoice_count: c._count.id,
      })),
      pending_quotes: quotes,
    });
  }

  private async getEmployeesSummary(businessId: string): Promise<string> {
    const [employees, recentExpenses] = await Promise.all([
      this.prisma.employee.findMany({
        where: { businessId },
        select: { firstName: true, lastName: true, position: true, contractType: true, grossSalary: true, isActive: true },
      }),
      this.prisma.expense.findMany({
        where: { businessId, employeeId: { not: null } },
        include: { employee: { select: { firstName: true, lastName: true } } },
        orderBy: { date: 'desc' },
        take: 5,
      }),
    ]);

    const active = employees.filter((e) => e.isActive);
    const monthlySalaryBurden = active.reduce((sum, e) => sum + e.grossSalary * 1.45, 0);

    return JSON.stringify({
      total: employees.length,
      active: active.length,
      monthly_gross_salary: active.reduce((sum, e) => sum + e.grossSalary, 0).toFixed(2),
      monthly_total_cost_estimate: monthlySalaryBurden.toFixed(2),
      employees: active.map((e) => ({
        name: `${e.firstName} ${e.lastName}`,
        position: e.position,
        contract: e.contractType,
        gross_salary: e.grossSalary.toFixed(2),
      })),
      recent_expense_reports: recentExpenses.map((e) => ({
        employee: e.employee ? `${e.employee.firstName} ${e.employee.lastName}` : 'Inconnu',
        description: e.description,
        amount: e.amount.toFixed(2),
        date: e.date.toISOString().split('T')[0],
      })),
    });
  }

  private async getRevenueGoalProgress(businessId: string): Promise<string> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { revenueGoal: true, type: true, activityType: true },
    });

    const year = new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    const paid = await this.prisma.invoice.aggregate({
      where: { businessId, status: 'PAID', paidAt: { gte: start, lte: end } },
      _sum: { total: true },
    });

    const ytdRevenue = paid._sum.total ?? 0;
    const goal = business?.revenueGoal ?? null;

    // Micro-enterprise thresholds 2024
    const isServices = business?.activityType?.includes('BIC_SERVICES') || business?.activityType?.includes('BNC');
    const threshold = isServices ? 77700 : 188700;

    return JSON.stringify({
      ytd_revenue: ytdRevenue.toFixed(2),
      annual_goal: goal?.toFixed(2) ?? null,
      goal_progress_pct: goal ? ((ytdRevenue / goal) * 100).toFixed(1) : null,
      threshold_limit: threshold,
      threshold_progress_pct: ((ytdRevenue / threshold) * 100).toFixed(1),
      threshold_remaining: (threshold - ytdRevenue).toFixed(2),
      alert: ytdRevenue > threshold * 0.9 ? 'ATTENTION : vous approchez du seuil du régime micro !' : null,
    });
  }

  private async createExpense(businessId: string, input: Record<string, unknown>): Promise<string> {
    const expense = await this.prisma.expense.create({
      data: {
        businessId,
        description: input.description as string,
        amount: input.amount as number,
        vatAmount: 0,
        category: ((input.category as string) ?? 'OTHER') as $Enums.ExpenseCategory,
        supplier: (input.supplier as string) ?? null,
        date: input.date ? new Date(input.date as string) : new Date(),
        isDeductible: true,
      },
    });

    return JSON.stringify({
      success: true,
      id: expense.id,
      message: `Dépense "${expense.description}" de ${(expense.amount).toFixed(2)} € créée avec succès.`,
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async buildMessages(userId: string, currentMessage: string): Promise<Anthropic.Beta.BetaMessageParam[]> {
    const history = await this.chatService.getHistory(userId, HISTORY_LIMIT);

    // Exclude the message we just saved (last entry) since we'll pass it separately
    const prior = history.slice(0, -1);

    const messages: Anthropic.Beta.BetaMessageParam[] = prior.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    messages.push({ role: 'user', content: currentMessage });
    return messages;
  }

  private async buildSystemPrompt(userId: string, businessId: string | null): Promise<string> {
    let businessContext = '';

    if (businessId) {
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: { name: true, type: true, revenueGoal: true, vatNumber: true },
      });

      if (business) {
        businessContext = `
## Contexte de l'entreprise
- Nom : ${business.name}
- Type : ${business.type}
- Objectif CA annuel : ${business.revenueGoal ? `${business.revenueGoal.toFixed(2)} €` : 'Non défini'}
- Assujetti TVA : ${business.vatNumber ? 'Oui' : 'Non'}
`;
      }
    }

    return `Tu es Konta IA, l'assistant comptable intelligent pour micro-entrepreneurs français.

Tu as accès à des outils pour consulter les données financières réelles de l'entreprise en temps réel.
Utilise-les proactivement pour répondre avec des chiffres précis plutôt que des estimations génériques.
${businessContext}
## Tes domaines d'expertise
- Comptabilité et fiscalité des micro-entreprises et auto-entrepreneurs (régime micro-BIC, micro-BNC)
- Cotisations URSSAF, taux applicables, déclarations trimestrielles/mensuelles
- TVA : franchise en base, seuils, déclarations CA3/CA12
- Facturation : mentions obligatoires, numérotation, délais de paiement (LME)
- CFE (Cotisation Foncière des Entreprises), CVAE, IS
- Déductibilité des charges, frais professionnels
- Optimisation fiscale légale pour indépendants

## Tes règles
- Réponds toujours en français
- Sois précis et pratique : cite les seuils chiffrés (85 000 €/188 700 € pour le régime micro, etc.)
- Avant de répondre sur les finances, utilise les outils pour obtenir les données réelles
- Si une question dépasse tes compétences (litige, audit), recommande un expert-comptable
- Ne jamais inventer des données financières : utilise toujours les outils disponibles
- Date d'aujourd'hui : ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
  }

  private getPeriodRange(period: string): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (period) {
      case 'current_month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'last_month':
        start.setMonth(now.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'current_year':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'last_year':
        start.setFullYear(now.getFullYear() - 1, 0, 1);
        start.setHours(0, 0, 0, 0);
        end.setFullYear(now.getFullYear() - 1, 11, 31);
        end.setHours(23, 59, 59, 999);
        break;
      default: // all_time
        start.setFullYear(2000, 0, 1);
        end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }

  private extractText(response: Anthropic.Beta.BetaMessage): string {
    return response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
  }
}
