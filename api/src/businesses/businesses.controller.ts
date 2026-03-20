import { Controller, Get, Post, Patch, Delete, Param, Body, ForbiddenException } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.businessesService.findByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.businessesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBusinessDto, @CurrentUser() user: AuthUser) {
    return this.businessesService.create({ ...dto, userId: user.id });
  }

  @Patch('me')
  updateMine(@Body() dto: UpdateBusinessDto, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.businessesService.update(user.businessId, user.id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBusinessDto, @CurrentUser() user: AuthUser) {
    return this.businessesService.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.businessesService.remove(id, user.id);
  }
}
