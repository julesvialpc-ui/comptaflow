import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // ── Next available number ──────────────────────────────────────────────────
  // Must be declared before :id to avoid route conflict
  @Get('next-number')
  nextNumber(@CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.invoicesService.generateNumber(user.businessId).then((number) => ({ number }));
  }

  // ── List ──────────────────────────────────────────────────────────────────
  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: InvoiceStatus,
    @Query('clientId') clientId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.invoicesService.findAll(user.businessId, {
      status,
      clientId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  // ── Single ────────────────────────────────────────────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.invoicesService.findOne(id, user.businessId);
  }

  // ── PDF download ──────────────────────────────────────────────────────────
  @Get(':id/pdf')
  async getPdf(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: any,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    const buffer = await this.invoicesService.generatePdf(id, user.businessId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="facture-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // ── Create ────────────────────────────────────────────────────────────────
  @Post()
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.invoicesService.create(dto, user.businessId);
  }

  // ── Update ────────────────────────────────────────────────────────────────
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.invoicesService.update(id, user.businessId, dto);
  }

  // ── Update status ─────────────────────────────────────────────────────────
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: InvoiceStatus,
    @CurrentUser() user: AuthUser,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.invoicesService.updateStatus(id, user.businessId, status);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.invoicesService.remove(id, user.businessId);
  }
}
