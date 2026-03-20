import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ExpenseCategory } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // ── Stats (before :id to avoid route conflict) ────────────────────────────
  @Get('stats')
  getStats(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.expensesService.getStats(
      user.businessId,
      from ? new Date(from) : undefined,
      to   ? new Date(to)   : undefined,
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────
  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('category')   category?: ExpenseCategory,
    @Query('search')     search?: string,
    @Query('from')       from?: string,
    @Query('to')         to?: string,
    @Query('deductible') deductible?: string,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.expensesService.findAll(user.businessId, {
      category,
      search,
      from:       from       ? new Date(from) : undefined,
      to:         to         ? new Date(to)   : undefined,
      deductible: deductible !== undefined ? deductible === 'true' : undefined,
    });
  }

  // ── Single ────────────────────────────────────────────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.expensesService.findOne(id, user.businessId);
  }

  // ── Create ────────────────────────────────────────────────────────────────
  @Post()
  create(@Body() dto: CreateExpenseDto, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.expensesService.create(dto, user.businessId);
  }

  // ── Update ────────────────────────────────────────────────────────────────
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.expensesService.update(id, user.businessId, dto);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.expensesService.remove(id, user.businessId);
  }
}
