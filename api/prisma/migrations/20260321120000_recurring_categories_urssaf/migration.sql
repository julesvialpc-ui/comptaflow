-- CreateEnum
CREATE TYPE "RecurrenceInterval" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL');

-- CreateTable
CREATE TABLE "user_categories" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#378ADD',
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_categories_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Expense
ALTER TABLE "expenses" ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "expenses" ADD COLUMN "recurrenceInterval" "RecurrenceInterval";
ALTER TABLE "expenses" ADD COLUMN "userCategoryId" TEXT;

-- AlterTable: Revenue
ALTER TABLE "revenues" ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "revenues" ADD COLUMN "recurrenceInterval" "RecurrenceInterval";
ALTER TABLE "revenues" ADD COLUMN "userCategoryId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_categories_businessId_slug_type_key" ON "user_categories"("businessId", "slug", "type");

-- AddForeignKey
ALTER TABLE "user_categories" ADD CONSTRAINT "user_categories_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_userCategoryId_fkey" FOREIGN KEY ("userCategoryId") REFERENCES "user_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenues" ADD CONSTRAINT "revenues_userCategoryId_fkey" FOREIGN KEY ("userCategoryId") REFERENCES "user_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
