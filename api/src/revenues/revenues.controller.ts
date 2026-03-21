import {
  Controller, Get, Post, Patch, Delete,
  Param, Query, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { RevenueCategory } from '@prisma/client';
import { RevenuesService } from './revenues.service';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { UpdateRevenueDto } from './dto/update-revenue.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@Controller('revenues')
export class RevenuesController {
  constructor(private readonly revenuesService: RevenuesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('category') category?: RevenueCategory,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.revenuesService.findAll(user.businessId!, {
      category,
      search,
      from: from ? new Date(from) : undefined,
      to:   to   ? new Date(to)   : undefined,
    });
  }

  @Get('stats')
  getStats(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.revenuesService.getStats(
      user.businessId!,
      from ? new Date(from) : undefined,
      to   ? new Date(to)   : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.revenuesService.findOne(id, user.businessId!);
  }

  @Post()
  create(@Body() dto: CreateRevenueDto, @CurrentUser() user: AuthUser) {
    return this.revenuesService.create(dto, user.businessId!);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateRevenueDto,
  ) {
    return this.revenuesService.update(id, user.businessId!, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.revenuesService.remove(id, user.businessId!);
  }
}
