import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { CategoryBudgetsService } from './category-budgets.service';
import { CreateCategoryBudgetDto } from './dto/create-category-budget.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@Controller('category-budgets')
export class CategoryBudgetsController {
  constructor(private readonly service: CategoryBudgetsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.service.findAll(user.businessId);
  }

  @Post()
  upsert(@Body() dto: CreateCategoryBudgetDto, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.service.upsert(dto, user.businessId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.service.remove(id, user.businessId);
  }
}
