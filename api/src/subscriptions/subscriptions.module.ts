import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { StripeService } from './stripe.service';
import { StripeWebhookGuard } from './stripe-webhook.guard';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, StripeService, StripeWebhookGuard],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
