import { Controller, Get, ForbiddenException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getStats(@CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.dashboardService.getStats(user.businessId);
  }

  @Get('urssaf')
  getUrssaf(@CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.dashboardService.getUrssaf(user.businessId);
  }

  @Get('forecast')
  getForecast(@CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.dashboardService.getForecast(user.businessId);
  }

  @Get('ir-estimate')
  getIrEstimate(@CurrentUser() user: AuthUser) {
    if (!user.businessId) throw new ForbiddenException('No business associated');
    return this.dashboardService.getIrEstimate(user.businessId);
  }
}
