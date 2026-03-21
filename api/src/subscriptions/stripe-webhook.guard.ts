import { CanActivate, ExecutionContext, Injectable, BadRequestException } from '@nestjs/common';
import { StripeService } from './stripe.service';

@Injectable()
export class StripeWebhookGuard implements CanActivate {
  constructor(private stripe: StripeService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const sig = req.headers['stripe-signature'];
    const secret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

    if (!sig) throw new BadRequestException('Missing stripe-signature header');

    try {
      const event = this.stripe.client.webhooks.constructEvent(req.rawBody, sig, secret);
      req.stripeEvent = event;
      return true;
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }
  }
}
