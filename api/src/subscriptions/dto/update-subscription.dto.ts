import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

export class UpdateSubscriptionDto {
  plan?: SubscriptionPlan;
  status?: SubscriptionStatus;
  stripeSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  trialEndsAt?: Date;
}
