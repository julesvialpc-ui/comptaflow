import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';

const PRICE_IDS: Record<'PRO' | 'BUSINESS', string> = {
  PRO: process.env.STRIPE_PRICE_PRO ?? '',
  BUSINESS: process.env.STRIPE_PRICE_BUSINESS ?? '',
};

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  private get stripe() { return this.stripeService.client; }

  async findByUser(userId: string) {
    let sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      sub = await this.prisma.subscription.create({
        data: { userId, plan: 'FREE', status: 'INACTIVE' },
      });
    }
    return sub;
  }

  async createCheckoutSession(userId: string, plan: 'PRO' | 'BUSINESS') {
    const priceId = PRICE_IDS[plan];
    if (!priceId || priceId.startsWith('price_REPLACE')) {
      throw new BadRequestException('Stripe price not configured');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    let sub = await this.findByUser(userId);
    let customerId = sub.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await this.prisma.subscription.update({
        where: { userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/subscription/success`,
      cancel_url: `${frontendUrl}/subscription/cancel`,
      subscription_data: { metadata: { userId, plan } },
      locale: 'fr',
      allow_promotion_codes: true,
    });
    return { url: session.url };
  }

  async createPortalSession(userId: string) {
    const sub = await this.findByUser(userId);
    if (!sub.stripeCustomerId) throw new BadRequestException('No active Stripe customer');
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const session = await this.stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${frontendUrl}/settings?tab=subscription`,
    });
    return { url: session.url };
  }

  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
    }
    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    if (session.mode !== 'subscription') return;
    const stripeSubId = session.subscription as string;
    const customerId = session.customer as string;
    const stripeSub = await this.stripe.subscriptions.retrieve(stripeSubId);
    const priceId = stripeSub.items.data[0]?.price.id;
    const plan = this.planFromPriceId(priceId);
    await this.prisma.subscription.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        plan, status: 'ACTIVE',
        stripeSubscriptionId: stripeSubId, stripePriceId: priceId,
        currentPeriodStart: new Date((stripeSub.items.data[0]?.current_period_start ?? stripeSub.start_date) * 1000),
        currentPeriodEnd: new Date((stripeSub.items.data[0]?.current_period_end ?? stripeSub.start_date + 2592000) * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      },
    });
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    const stripeSubId = (invoice as any).subscription as string | null;
    if (!stripeSubId) return;
    const stripeSub = await this.stripe.subscriptions.retrieve(stripeSubId);
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSubId },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: new Date((stripeSub.items.data[0]?.current_period_start ?? stripeSub.start_date) * 1000),
        currentPeriodEnd: new Date((stripeSub.items.data[0]?.current_period_end ?? stripeSub.start_date + 2592000) * 1000),
      },
    });
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const stripeSubId = (invoice as any).subscription as string | null;
    if (!stripeSubId) return;
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSubId },
      data: { status: 'PAST_DUE' },
    });
  }

  private async handleSubscriptionUpdated(stripeSub: Stripe.Subscription) {
    const priceId = stripeSub.items.data[0]?.price.id;
    const plan = this.planFromPriceId(priceId);
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSub.id },
      data: {
        plan, stripePriceId: priceId,
        status: stripeSub.status === 'active' ? 'ACTIVE' : 'PAST_DUE',
        currentPeriodStart: new Date((stripeSub.items.data[0]?.current_period_start ?? stripeSub.start_date) * 1000),
        currentPeriodEnd: new Date((stripeSub.items.data[0]?.current_period_end ?? stripeSub.start_date + 2592000) * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      },
    });
  }

  private async handleSubscriptionDeleted(stripeSub: Stripe.Subscription) {
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSub.id },
      data: {
        plan: 'FREE', status: 'CANCELLED',
        stripeSubscriptionId: null, stripePriceId: null,
        currentPeriodEnd: null, cancelAtPeriodEnd: false,
      },
    });
  }

  private planFromPriceId(priceId?: string): SubscriptionPlan {
    if (priceId === PRICE_IDS.BUSINESS) return 'BUSINESS';
    if (priceId === PRICE_IDS.PRO) return 'PRO';
    return 'FREE';
  }
}
