import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';
import { Public } from '../auth/decorators/public.decorator';
import { StripeWebhookGuard } from './stripe-webhook.guard';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly planLimits: PlanLimitsService,
  ) {}

  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.findByUser(user.id);
  }

  @Get('usage')
  getUsage(@CurrentUser() user: AuthUser) {
    if (!user.businessId) return { plan: 'FREE', limits: null, usage: {} };
    return this.planLimits.getUsage(user.id, user.businessId);
  }

  @Post('checkout')
  createCheckout(
    @Body() body: { plan: 'PRO' | 'BUSINESS' },
    @CurrentUser() user: AuthUser,
  ) {
    return this.subscriptionsService.createCheckoutSession(user.id, body.plan);
  }

  @Post('portal')
  createPortal(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.createPortalSession(user.id);
  }

  @Public()
  @UseGuards(StripeWebhookGuard)
  @Post('webhook')
  handleWebhook(@Req() req: Request & { stripeEvent: any }) {
    return this.subscriptionsService.handleWebhook(req.stripeEvent);
  }
}
