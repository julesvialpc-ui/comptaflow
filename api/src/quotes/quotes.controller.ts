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
import { QuoteStatus } from '@prisma/client';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get('next-number')
  nextNumber(@CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.quotesService.generateNumber(user.businessId).then((number) => ({ number }));
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: QuoteStatus,
    @Query('clientId') clientId?: string,
    @Query('search') search?: string,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.quotesService.findAll(user.businessId, { status, clientId, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.quotesService.findOne(id, user.businessId);
  }

  @Post()
  create(@Body() dto: CreateQuoteDto, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.quotesService.create(dto, user.businessId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.quotesService.update(id, user.businessId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.quotesService.remove(id, user.businessId);
  }

  @Post(':id/convert')
  convert(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.quotesService.convertToInvoice(id, user.businessId);
  }
}
