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
import { TimeEntriesService } from './time-entries.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';

@Controller('time-entries')
export class TimeEntriesController {
  constructor(
    private readonly service: TimeEntriesService,
    private readonly planLimits: PlanLimitsService,
  ) {}

  @Get('stats')
  async getStats(@CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    await this.planLimits.assertMinPlan(user.id, 'PRO');
    return this.service.getStats(user.businessId);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('clientId') clientId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('isBilled') isBilled?: string,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    await this.planLimits.assertMinPlan(user.id, 'PRO');
    return this.service.findAll(user.businessId, {
      clientId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      isBilled: isBilled !== undefined ? isBilled === 'true' : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.service.findOne(id, user.businessId);
  }

  @Post('generate-invoice')
  async generateInvoice(
    @Body() body: { clientId: string; timeEntryIds: string[] },
    @CurrentUser() user: AuthUser,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    await this.planLimits.assertMinPlan(user.id, 'PRO');
    return this.service.generateInvoice(user.businessId, body);
  }

  @Post()
  async create(@Body() dto: CreateTimeEntryDto, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    await this.planLimits.assertMinPlan(user.id, 'PRO');
    return this.service.create(dto, user.businessId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTimeEntryDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    await this.planLimits.assertMinPlan(user.id, 'PRO');
    return this.service.update(id, user.businessId, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    await this.planLimits.assertMinPlan(user.id, 'PRO');
    return this.service.remove(id, user.businessId);
  }
}
