import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { UserCategoriesService } from './user-categories.service';
import { CreateUserCategoryDto } from './dto/create-user-category.dto';
import { UpdateUserCategoryDto } from './dto/update-user-category.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@Controller('user-categories')
export class UserCategoriesController {
  constructor(private readonly userCategoriesService: UserCategoriesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('type') type?: string,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.userCategoriesService.findAll(user.businessId, type);
  }

  @Post()
  create(@Body() dto: CreateUserCategoryDto, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.userCategoriesService.create(user.businessId, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserCategoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.userCategoriesService.update(id, user.businessId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.userCategoriesService.remove(id, user.businessId);
  }
}
