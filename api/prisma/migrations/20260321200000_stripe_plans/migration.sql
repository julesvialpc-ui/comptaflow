-- Remove STARTER from enum (migrate any existing STARTER to FREE first)
UPDATE subscriptions SET plan = 'FREE' WHERE plan = 'STARTER';

-- Recreate enum without STARTER
ALTER TYPE "SubscriptionPlan" RENAME TO "SubscriptionPlan_old";
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO', 'BUSINESS');
ALTER TABLE "subscriptions" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "subscriptions" ALTER COLUMN "plan" TYPE "SubscriptionPlan" USING plan::text::"SubscriptionPlan";
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DEFAULT 'FREE';
DROP TYPE "SubscriptionPlan_old";

-- Add stripePriceId column
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;
