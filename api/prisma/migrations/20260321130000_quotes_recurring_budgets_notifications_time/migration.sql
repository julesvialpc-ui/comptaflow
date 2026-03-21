-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'INVOICE_OVERDUE';
ALTER TYPE "NotificationType" ADD VALUE 'URSSAF_DEADLINE';
ALTER TYPE "NotificationType" ADD VALUE 'BUDGET_EXCEEDED';
ALTER TYPE "NotificationType" ADD VALUE 'THRESHOLD_WARNING';

-- AlterTable: Add recurring fields to invoices
ALTER TABLE "invoices" ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "invoices" ADD COLUMN "recurrenceInterval" "RecurrenceInterval";

-- AlterTable: Add link to notifications
ALTER TABLE "notifications" ADD COLUMN "link" TEXT;

-- CreateTable: quotes
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "clientId" TEXT,
    "number" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "convertedInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: quote_items
CREATE TABLE "quote_items" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: category_budgets
CREATE TABLE "category_budgets" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'MONTHLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable: time_entries
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "clientId" TEXT,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "isBilled" BOOLEAN NOT NULL DEFAULT false,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotes_convertedInvoiceId_key" ON "quotes"("convertedInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "category_budgets_businessId_category_period_key" ON "category_budgets"("businessId", "category", "period");

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
