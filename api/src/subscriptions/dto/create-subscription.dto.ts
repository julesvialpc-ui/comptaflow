import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

export class CreateSubscriptionDto {
  userId: string;
  plan?: SubscriptionPlan;
  status?: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  trialEndsAt?: Date;
}
