import { Controller, Get, Post, Patch, Delete, Param, Body, ForbiddenException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.notificationsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.findOne(id, user.id);
  }

  @Post()
  create(@Body() dto: CreateNotificationDto, @CurrentUser() user: AuthUser) {
    return this.notificationsService.create(dto, user.id);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNotificationDto, @CurrentUser() user: AuthUser) {
    return this.notificationsService.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.remove(id, user.id);
  }

  @Post('generate')
  generate(@CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.notificationsService.generate(user.id, user.businessId);
  }
}
