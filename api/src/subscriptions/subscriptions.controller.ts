import { Controller, Get, Patch, Body } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.findByUser(user.id);
  }

  @Patch('me')
  updateMine(@Body() dto: UpdateSubscriptionDto, @CurrentUser() user: AuthUser) {
    return this.subscriptionsService.update(user.id, dto);
  }
}
