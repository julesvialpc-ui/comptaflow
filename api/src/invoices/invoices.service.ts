import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import PDFDocument from 'pdfkit';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtEur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  // ── List ──────────────────────────────────────────────────────────────────

  findAll(
    businessId: string,
    filters: { status?: InvoiceStatus; clientId?: string; from?: Date; to?: Date } = {},
  ) {
    return this.prisma.invoice.findMany({
      where: {
        businessId,
        ...(filters.status && { status: filters.status }),
        ...(filters.clientId && { clientId: filters.clientId }),
        ...((filters.from || filters.to) && {
          issueDate: {
            ...(filters.from && { gte: filters.from }),
            ...(filters.to && { lte: filters.to }),
          },
        }),
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
        items: true,
      },
      orderBy: { issueDate: 'desc' },
    });
  }

  // ── Single ────────────────────────────────────────────────────────────────

  async findOne(id: string, businessId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, businessId },
      include: {
        client: true,
        items: true,
        transactions: true,
        business: true,
      },
    });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  // ── Auto-number ───────────────────────────────────────────────────────────

  async generateNumber(businessId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count({
      where: { businessId, number: { startsWith: `FAC-${year}-` } },
    });
    return `FAC-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  // ── Create ────────────────────────────────────────────────────────────────

  create(dto: CreateInvoiceDto, businessId: string) {
    const { items, ...invoiceData } = dto;
    const vatRate = invoiceData.vatRate ?? 0;
    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;

    return this.prisma.invoice.create({
      data: {
        ...invoiceData,
        businessId,
        subtotal,
        vatAmount,
        total,
        items: {
          create: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            vatRate: item.vatRate ?? 0,
            total: item.quantity * item.unitPrice * (1 + (item.vatRate ?? 0) / 100),
          })),
        },
      },
      include: { client: true, items: true },
    });
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: string, businessId: string, dto: UpdateInvoiceDto) {
    await this.findOne(id, businessId);
    const { items, ...invoiceData } = dto;

    let totals = {};
    if (items) {
      const vatRate = invoiceData.vatRate ?? 0;
      const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      const vatAmount = subtotal * (vatRate / 100);
      totals = { subtotal, vatAmount, total: subtotal + vatAmount };
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...invoiceData,
        ...totals,
        ...(items && {
          items: {
            deleteMany: {},
            create: items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              vatRate: item.vatRate ?? 0,
              total: item.quantity * item.unitPrice * (1 + (item.vatRate ?? 0) / 100),
            })),
          },
        }),
      },
      include: { client: true, items: true },
    });
  }

  // ── Update status ─────────────────────────────────────────────────────────

  async updateStatus(id: string, businessId: string, status: InvoiceStatus) {
    await this.findOne(id, businessId);
    return this.prisma.invoice.update({
      where: { id },
      data: {
        status,
        ...(status === 'PAID' && { paidAt: new Date() }),
        ...(status !== 'PAID' && { paidAt: null }),
      },
    });
  }

  // ── Remove ────────────────────────────────────────────────────────────────

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    return this.prisma.invoice.delete({ where: { id } });
  }

  // ── PDF ───────────────────────────────────────────────────────────────────

  async generatePdf(id: string, businessId: string): Promise<Buffer> {
    const invoice = await this.findOne(id, businessId);
    const biz = invoice.business;
    const client = invoice.client;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = 495; // usable width
      const L = 50;  // left margin
      const R = 545; // right edge

      // ── Header row ──────────────────────────────────────────────────────────
      doc.fontSize(18).font('Helvetica-Bold').text(biz.name, L, 50);
      if (biz.address) doc.fontSize(9).font('Helvetica').text(biz.address, L, 74);
      const cityLine = [biz.postalCode, biz.city].filter(Boolean).join(' ');
      if (cityLine) doc.fontSize(9).text(cityLine, L, 86);
      if (biz.siret) doc.fontSize(9).text(`SIRET : ${biz.siret}`, L, 98);
      if (biz.vatNumber) doc.fontSize(9).text(`N° TVA : ${biz.vatNumber}`, L, 110);

      // "FACTURE" title right-aligned
      doc.fontSize(26).font('Helvetica-Bold').fillColor('#4f46e5')
        .text('FACTURE', L, 50, { width: W, align: 'right' });
      doc.fillColor('#000000');

      // Invoice meta right-aligned
      doc.fontSize(9).font('Helvetica');
      const metaX = 380;
      const metaW = 165;
      doc.text(`N° ${invoice.number}`, metaX, 84, { width: metaW, align: 'right' });
      doc.text(`Émise le : ${fmtDate(invoice.issueDate)}`, metaX, 96, { width: metaW, align: 'right' });
      if (invoice.dueDate)
        doc.text(`Échéance : ${fmtDate(invoice.dueDate)}`, metaX, 108, { width: metaW, align: 'right' });
      if (invoice.paidAt)
        doc.fillColor('#16a34a').text(`Payée le : ${fmtDate(invoice.paidAt)}`, metaX, 120, { width: metaW, align: 'right' }).fillColor('#000000');

      // ── Divider ──────────────────────────────────────────────────────────────
      doc.moveTo(L, 138).lineTo(R, 138).strokeColor('#e4e4e7').stroke();

      // ── Bill-to block ────────────────────────────────────────────────────────
      doc.fontSize(8).font('Helvetica').fillColor('#71717a').text('FACTURER À', L, 150);
      doc.fillColor('#000000');
      let by = 163;
      if (client) {
        doc.fontSize(11).font('Helvetica-Bold').text(client.name, L, by); by += 15;
        doc.fontSize(9).font('Helvetica');
        if (client.address) { doc.text(client.address, L, by); by += 12; }
        const cCity = [client.postalCode, client.city].filter(Boolean).join(' ');
        if (cCity) { doc.text(cCity, L, by); by += 12; }
        if (client.email) { doc.text(client.email, L, by); by += 12; }
        if (client.siret) { doc.text(`SIRET : ${client.siret}`, L, by); by += 12; }
        if (client.vatNumber) { doc.text(`N° TVA : ${client.vatNumber}`, L, by); by += 12; }
      } else {
        doc.fontSize(9).font('Helvetica').text('Client non renseigné', L, by);
      }

      // ── Items table ──────────────────────────────────────────────────────────
      const tableY = Math.max(by + 20, 240);

      // Column x-positions and widths
      const cols = {
        desc:  { x: L,   w: 220 },
        qty:   { x: 275, w: 45  },
        price: { x: 325, w: 85  },
        vat:   { x: 415, w: 45  },
        total: { x: 465, w: 80  },
      };

      // Header background
      doc.rect(L, tableY, W, 18).fillColor('#4f46e5').fill();
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('Description',   cols.desc.x + 4,  tableY + 5, { width: cols.desc.w  - 4 });
      doc.text('Qté',           cols.qty.x,        tableY + 5, { width: cols.qty.w,  align: 'center' });
      doc.text('Prix unit. HT', cols.price.x,      tableY + 5, { width: cols.price.w, align: 'right' });
      doc.text('TVA',           cols.vat.x,        tableY + 5, { width: cols.vat.w,  align: 'center' });
      doc.text('Total HT',      cols.total.x,      tableY + 5, { width: cols.total.w, align: 'right' });
      doc.fillColor('#000000');

      // Rows
      let rowY = tableY + 18;
      invoice.items.forEach((item, i) => {
        const bg = i % 2 === 0 ? '#fafafa' : '#ffffff';
        doc.rect(L, rowY, W, 18).fillColor(bg).fill();
        doc.fontSize(8).font('Helvetica').fillColor('#18181b');
        doc.text(item.description, cols.desc.x + 4, rowY + 5, { width: cols.desc.w - 4, ellipsis: true });
        doc.text(String(item.quantity), cols.qty.x, rowY + 5, { width: cols.qty.w, align: 'center' });
        doc.text(fmtEur(item.unitPrice), cols.price.x, rowY + 5, { width: cols.price.w, align: 'right' });
        doc.text(`${item.vatRate ?? 0} %`, cols.vat.x, rowY + 5, { width: cols.vat.w, align: 'center' });
        doc.text(fmtEur(item.quantity * item.unitPrice), cols.total.x, rowY + 5, { width: cols.total.w, align: 'right' });
        rowY += 18;
      });

      // Bottom border of table
      doc.moveTo(L, rowY).lineTo(R, rowY).strokeColor('#e4e4e7').stroke();

      // ── Totals block ─────────────────────────────────────────────────────────
      let totY = rowY + 14;
      const totLabelX = 360;
      const totValueX = 455;
      const totW = 90;

      doc.fontSize(9).font('Helvetica').fillColor('#3f3f46');
      doc.text('Sous-total HT :', totLabelX, totY, { width: 90 });
      doc.text(fmtEur(invoice.subtotal), totValueX, totY, { width: totW, align: 'right' });
      totY += 16;

      doc.text(`TVA (${invoice.vatRate ?? 0} %) :`, totLabelX, totY, { width: 90 });
      doc.text(fmtEur(invoice.vatAmount), totValueX, totY, { width: totW, align: 'right' });
      totY += 8;

      doc.moveTo(totLabelX, totY).lineTo(R, totY).strokeColor('#e4e4e7').stroke();
      totY += 8;

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#18181b');
      doc.text('TOTAL TTC :', totLabelX, totY, { width: 90 });
      doc.text(fmtEur(invoice.total), totValueX, totY, { width: totW, align: 'right' });
      totY += 22;

      // ── Notes / payment terms ─────────────────────────────────────────────────
      if (invoice.paymentTerms || invoice.notes) {
        doc.moveTo(L, totY).lineTo(R, totY).strokeColor('#e4e4e7').stroke();
        totY += 14;
      }
      if (invoice.paymentTerms) {
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#3f3f46').text('Conditions de paiement :', L, totY);
        totY += 12;
        doc.fontSize(8).font('Helvetica').fillColor('#71717a').text(invoice.paymentTerms, L, totY, { width: W });
        totY += 20;
      }
      if (invoice.notes) {
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#3f3f46').text('Notes :', L, totY);
        totY += 12;
        doc.fontSize(8).font('Helvetica').fillColor('#71717a').text(invoice.notes, L, totY, { width: W });
      }

      // ── Footer ────────────────────────────────────────────────────────────────
      doc.fontSize(7).font('Helvetica').fillColor('#a1a1aa')
        .text(
          `${biz.name} — ${biz.siret ? 'SIRET ' + biz.siret : ''} — Document généré par ComptaFlow`,
          L,
          780,
          { width: W, align: 'center' },
        );

      doc.end();
    });
  }
}
