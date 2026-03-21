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
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.clientsService.findAll(user.businessId, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.clientsService.findOne(id, user.businessId);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.clientsService.getStats(id, user.businessId);
  }

  @Post()
  create(@Body() dto: CreateClientDto, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.clientsService.create(dto, user.businessId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.clientsService.update(id, user.businessId, dto);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.clientsService.toggleActive(id, user.businessId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.clientsService.remove(id, user.businessId);
  }
}
