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
import { TaxReportStatus, TaxReportType } from '@prisma/client';
import { TaxReportsService } from './tax-reports.service';
import { CreateTaxReportDto } from './dto/create-tax-report.dto';
import { UpdateTaxReportDto } from './dto/update-tax-report.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@Controller('tax-reports')
export class TaxReportsController {
  constructor(private readonly taxReportsService: TaxReportsService) {}

  // ── Upcoming (before :id) ─────────────────────────────────────────────────
  @Get('upcoming')
  upcoming(@CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.taxReportsService.upcoming(user.businessId);
  }

  // ── Auto-calculate preview ────────────────────────────────────────────────
  @Get('preview')
  preview(
    @CurrentUser() user: AuthUser,
    @Query('type')        type: TaxReportType,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd')   periodEnd: string,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.taxReportsService.preview(
      user.businessId,
      type,
      new Date(periodStart),
      new Date(periodEnd),
    );
  }

  // ── Expense report PDF ────────────────────────────────────────────────────
  @Get('expense-report/pdf')
  async expenseReportPdf(
    @CurrentUser() user: AuthUser,
    @Query('from') from: string,
    @Query('to')   to:   string,
    @Res()         res:  any,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    const buffer = await this.taxReportsService.generateExpenseReportPdf(
      user.businessId,
      new Date(from),
      new Date(to),
    );
    const label = `note-de-frais-${from.slice(0, 7)}-${to.slice(0, 7)}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${label}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // ── List ──────────────────────────────────────────────────────────────────
  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('type')   type?:   TaxReportType,
    @Query('status') status?: TaxReportStatus,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.taxReportsService.findAll(user.businessId, { type, status });
  }

  // ── Single ────────────────────────────────────────────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.taxReportsService.findOne(id, user.businessId);
  }

  // ── Create ────────────────────────────────────────────────────────────────
  @Post()
  create(@Body() dto: CreateTaxReportDto, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.taxReportsService.create(dto, user.businessId);
  }

  // ── Update ────────────────────────────────────────────────────────────────
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaxReportDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.taxReportsService.update(id, user.businessId, dto);
  }

  // ── Update status ─────────────────────────────────────────────────────────
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: TaxReportStatus,
    @CurrentUser() user: AuthUser,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.taxReportsService.updateStatus(id, user.businessId, status);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.taxReportsService.remove(id, user.businessId);
  }
}
