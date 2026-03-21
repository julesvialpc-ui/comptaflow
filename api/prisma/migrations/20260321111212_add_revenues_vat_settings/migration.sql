-- CreateEnum
CREATE TYPE "RevenueCategory" AS ENUM ('SERVICES', 'PRODUCTS', 'CONSULTING', 'FREELANCE', 'SUBSCRIPTION', 'RENTAL', 'OTHER');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "defaultVatRate" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
ADD COLUMN     "isVatSubject" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "revenues" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "category" "RevenueCategory" NOT NULL DEFAULT 'SERVICES',
    "amount" DOUBLE PRECISION NOT NULL,
    "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenues_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "revenues" ADD CONSTRAINT "revenues_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
