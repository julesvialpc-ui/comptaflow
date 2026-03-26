-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('BIC_VENTE', 'BIC_SERVICES', 'BNC', 'BNC_CIPAV');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "activityType" "ActivityType" NOT NULL DEFAULT 'BIC_SERVICES';
