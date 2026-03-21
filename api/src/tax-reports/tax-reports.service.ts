import { Injectable, NotFoundException } from '@nestjs/common';
import { TaxReportStatus, TaxReportType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaxReportDto } from './dto/create-tax-report.dto';
import { UpdateTaxReportDto } from './dto/update-tax-report.dto';
import PDFDocument from 'pdfkit';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtEur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const CAT_FR: Record<string, string> = {
  OFFICE_SUPPLIES: 'Fournitures de bureau',
  TRAVEL: 'Déplacements',
  MEALS: 'Repas & restauration',
  EQUIPMENT: 'Matériel',
  SOFTWARE: 'Logiciels & abonnements',
  MARKETING: 'Marketing & publicité',
  PROFESSIONAL_FEES: 'Honoraires',
  RENT: 'Loyer',
  UTILITIES: 'Charges & utilités',
  INSURANCE: 'Assurance',
  TAXES: 'Impôts & taxes',
  SALARY: 'Salaires',
  OTHER: 'Autres',
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class TaxReportsService {
  constructor(private prisma: PrismaService) {}

  // ── List ──────────────────────────────────────────────────────────────────

  findAll(businessId: string, filters: { type?: TaxReportType; status?: TaxReportStatus } = {}) {
    return this.prisma.taxReport.findMany({
      where: {
        businessId,
        ...(filters.type   && { type:   filters.type   }),
        ...(filters.status && { status: filters.status }),
      },
      orderBy: [{ dueDate: 'desc' }, { periodEnd: 'desc' }],
    });
  }

  // ── Upcoming ──────────────────────────────────────────────────────────────

  upcoming(businessId: string) {
    const in90Days = new Date();
    in90Days.setDate(in90Days.getDate() + 90);
    return this.prisma.taxReport.findMany({
      where: {
        businessId,
        status: { not: 'VALIDATED' },
        dueDate: { lte: in90Days },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });
  }

  // ── Auto-preview (compute without saving) ─────────────────────────────────

  async preview(
    businessId: string,
    type: TaxReportType,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{ amount: number; details: Record<string, number> }> {
    const dateFilter = { gte: periodStart, lte: periodEnd };

    if (type === 'TVA') {
      const [inv, exp] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: { businessId, status: 'PAID', issueDate: dateFilter },
          _sum: { vatAmount: true, subtotal: true, total: true },
          _count: { _all: true },
        }),
        this.prisma.expense.aggregate({
          where: { businessId, isDeductible: true, date: dateFilter },
          _sum: { vatAmount: true },
          _count: { _all: true },
        }),
      ]);
      const invoiceVAT  = inv._sum.vatAmount ?? 0;
      const expenseVAT  = exp._sum.vatAmount ?? 0;
      const netVAT      = Math.max(0, invoiceVAT - expenseVAT);
      return {
        amount: netVAT,
        details: {
          invoiceCount:         inv._count._all,
          invoiceTotalHT:       inv._sum.subtotal  ?? 0,
          invoiceTotalTTC:      inv._sum.total     ?? 0,
          invoiceVATCollected:  invoiceVAT,
          expenseCount:         exp._count._all,
          expenseVATDeductible: expenseVAT,
          netVATDue:            netVAT,
        },
      };
    }

    if (type === 'URSSAF') {
      const inv = await this.prisma.invoice.aggregate({
        where: { businessId, status: 'PAID', issueDate: dateFilter },
        _sum: { subtotal: true },
        _count: { _all: true },
      });
      const revenue = inv._sum.subtotal ?? 0;
      const rate    = 22.0; // cotisation auto-entrepreneur BNC
      const amount  = revenue * (rate / 100);
      return {
        amount,
        details: {
          invoiceCount:  inv._count._all,
          revenueHT:     revenue,
          cotisationRate: rate,
          cotisationDue:  amount,
        },
      };
    }

    if (type === 'IR') {
      const inv = await this.prisma.invoice.aggregate({
        where: { businessId, status: 'PAID', issueDate: dateFilter },
        _sum: { subtotal: true },
        _count: { _all: true },
      });
      const revenue    = inv._sum.subtotal ?? 0;
      const abattement = revenue * 0.34; // abattement forfaitaire 34% BNC
      const base       = revenue - abattement;
      return {
        amount: base,
        details: {
          invoiceCount:         inv._count._all,
          revenueHT:            revenue,
          abattementForFaitaire: abattement,
          baseImposable:        base,
        },
      };
    }

    return { amount: 0, details: {} };
  }

  // ── Single ────────────────────────────────────────────────────────────────

  async findOne(id: string, businessId: string) {
    const report = await this.prisma.taxReport.findFirst({ where: { id, businessId } });
    if (!report) throw new NotFoundException(`TaxReport ${id} not found`);
    return report;
  }

  // ── Create ────────────────────────────────────────────────────────────────

  create(dto: CreateTaxReportDto, businessId: string) {
    return this.prisma.taxReport.create({
      data: { ...dto, businessId, details: dto.details as object ?? undefined },
    });
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: string, businessId: string, dto: UpdateTaxReportDto) {
    await this.findOne(id, businessId);
    return this.prisma.taxReport.update({
      where: { id },
      data: { ...dto, details: dto.details as object ?? undefined },
    });
  }

  // ── Update status ─────────────────────────────────────────────────────────

  async updateStatus(id: string, businessId: string, status: TaxReportStatus) {
    await this.findOne(id, businessId);
    return this.prisma.taxReport.update({
      where: { id },
      data: {
        status,
        ...(status === 'SUBMITTED' && { submittedAt: new Date() }),
      },
    });
  }

  // ── Remove ────────────────────────────────────────────────────────────────

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    return this.prisma.taxReport.delete({ where: { id } });
  }

  // ── Expense report PDF ────────────────────────────────────────────────────

  async generateExpenseReportPdf(
    businessId: string,
    from: Date,
    to: Date,
  ): Promise<Buffer> {
    const [business, expenses] = await Promise.all([
      this.prisma.business.findUnique({ where: { id: businessId } }),
      this.prisma.expense.findMany({
        where: { businessId, date: { gte: from, lte: to } },
        orderBy: [{ category: 'asc' }, { date: 'asc' }],
      }),
    ]);

    if (!business) throw new NotFoundException('Business not found');

    return new Promise<Buffer>((resolve, reject) => {
      const doc    = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end',  ()         => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = 495;
      const L = 50;
      const R = 545;

      // ── Header ──────────────────────────────────────────────────────────────
      doc.fontSize(18).font('Helvetica-Bold').text(business.name, L, 50);
      if (business.address) doc.fontSize(9).font('Helvetica').text(business.address, L, 74);
      const cityLine = [business.postalCode, business.city].filter(Boolean).join(' ');
      if (cityLine) doc.fontSize(9).text(cityLine, L, 86);
      if (business.siret) doc.fontSize(9).text(`SIRET : ${business.siret}`, L, 98);

      doc.fontSize(22).font('Helvetica-Bold').fillColor('#4f46e5')
        .text('NOTE DE FRAIS', L, 50, { width: W, align: 'right' });
      doc.fillColor('#000000');
      doc.fontSize(9).font('Helvetica')
        .text(`Du ${fmtDate(from)} au ${fmtDate(to)}`, L, 78, { width: W, align: 'right' });
      doc.fontSize(9).text(
        `Générée le ${fmtDate(new Date())}`,
        L, 90, { width: W, align: 'right' },
      );

      doc.moveTo(L, 120).lineTo(R, 120).strokeColor('#e4e4e7').stroke();

      // ── Table header ────────────────────────────────────────────────────────
      const tableY = 135;
      const cols   = { date: L, cat: 100, desc: 200, supplier: 330, ht: 400, vat: 455, ttc: 495 };

      doc.rect(L, tableY, W, 18).fillColor('#4f46e5').fill();
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('Date',         cols.date,     tableY + 5, { width: 45 });
      doc.text('Catégorie',    cols.cat,      tableY + 5, { width: 95 });
      doc.text('Description',  cols.desc,     tableY + 5, { width: 125 });
      doc.text('Fournisseur',  cols.supplier, tableY + 5, { width: 65 });
      doc.text('HT',           cols.ht,       tableY + 5, { width: 50, align: 'right' });
      doc.text('TVA',          cols.vat,      tableY + 5, { width: 35, align: 'right' });
      doc.text('TTC',          cols.ttc,      tableY + 5, { width: 50, align: 'right' });
      doc.fillColor('#000000');

      // ── Rows ────────────────────────────────────────────────────────────────
      let rowY       = tableY + 18;
      let totalHT    = 0;
      let totalVAT   = 0;
      let deductHT   = 0;

      if (expenses.length === 0) {
        doc.rect(L, rowY, W, 24).fillColor('#fafafa').fill();
        doc.fontSize(9).font('Helvetica').fillColor('#71717a')
          .text('Aucune dépense sur cette période.', L + 4, rowY + 8, { width: W });
        rowY += 24;
      }

      expenses.forEach((exp, i) => {
        const bg   = i % 2 === 0 ? '#fafafa' : '#ffffff';
        const ttc  = exp.amount + exp.vatAmount;
        totalHT   += exp.amount;
        totalVAT  += exp.vatAmount;
        if (exp.isDeductible) deductHT += exp.amount;

        doc.rect(L, rowY, W, 18).fillColor(bg).fill();
        doc.fontSize(7.5).font('Helvetica').fillColor('#18181b');
        doc.text(fmtDate(exp.date),                                cols.date,     rowY + 5, { width: 45  });
        doc.text(CAT_FR[exp.category] ?? exp.category,             cols.cat,      rowY + 5, { width: 95, ellipsis: true });
        doc.text(exp.description ?? '—',                           cols.desc,     rowY + 5, { width: 125, ellipsis: true });
        doc.text(exp.supplier    ?? '—',                           cols.supplier, rowY + 5, { width: 65, ellipsis: true });
        doc.text(fmtEur(exp.amount),    cols.ht,  rowY + 5, { width: 50, align: 'right' });
        doc.text(exp.vatAmount > 0 ? fmtEur(exp.vatAmount) : '—', cols.vat, rowY + 5, { width: 35, align: 'right' });
        doc.text(fmtEur(ttc),           cols.ttc, rowY + 5, { width: 50, align: 'right' });

        if (!exp.isDeductible) {
          doc.fontSize(6).fillColor('#ef4444').text('non déd.', cols.ttc - 42, rowY + 10);
          doc.fillColor('#000000');
        }
        rowY += 18;
      });

      // ── Totals ──────────────────────────────────────────────────────────────
      doc.moveTo(L, rowY).lineTo(R, rowY).strokeColor('#e4e4e7').stroke();
      let tY = rowY + 12;

      const tLbl = 340;
      const tVal = 480;
      const tW   = 65;

      doc.fontSize(9).font('Helvetica').fillColor('#3f3f46');
      doc.text('Total HT :',         tLbl, tY,      { width: 130 });
      doc.text(fmtEur(totalHT),      tVal, tY,      { width: tW, align: 'right' });
      doc.text('TVA :',              tLbl, tY + 14, { width: 130 });
      doc.text(fmtEur(totalVAT),     tVal, tY + 14, { width: tW, align: 'right' });
      doc.moveTo(tLbl, tY + 28).lineTo(R, tY + 28).strokeColor('#e4e4e7').stroke();
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#18181b');
      doc.text('Total TTC :',              tLbl, tY + 32, { width: 130 });
      doc.text(fmtEur(totalHT + totalVAT), tVal, tY + 32, { width: tW, align: 'right' });
      doc.fontSize(9).font('Helvetica').fillColor('#16a34a');
      doc.text(`Dont déductible HT : ${fmtEur(deductHT)}`, tLbl, tY + 50, { width: 200 });

      // ── Footer ───────────────────────────────────────────────────────────────
      doc.fontSize(7).font('Helvetica').fillColor('#a1a1aa')
        .text(
          `${business.name} — ${business.siret ? 'SIRET ' + business.siret : ''} — Document généré par Konta`,
          L, 780, { width: W, align: 'center' },
        );

      doc.end();
    });
  }
}
