// ─── Invoice types ───────────────────────────────────────────────────────────

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
}

export interface ClientRef {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string;
  siret?: string | null;
  vatNumber?: string | null;
}

export interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  notes: string | null;
  paymentTerms: string | null;
  clientId: string | null;
  client: ClientRef | null;
  items: InvoiceItem[];
  isRecurring?: boolean;
  recurrenceInterval?: RecurrenceInterval | null;
}

export interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string;
  siret?: string | null;
  vatNumber?: string | null;
  notes?: string | null;
  isActive: boolean;
}

// ─── Quote types ─────────────────────────────────────────────────────────────

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
}

export interface Quote {
  id: string;
  number: string;
  status: QuoteStatus;
  issueDate: string;
  expiryDate: string | null;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  notes: string | null;
  clientId: string | null;
  client: ClientRef | null;
  items: QuoteItem[];
  convertedInvoiceId: string | null;
}

// ─── Time Entry types ────────────────────────────────────────────────────────

export interface TimeEntry {
  id: string;
  clientId: string | null;
  client: { id: string; name: string } | null;
  description: string;
  date: string;
  hours: number;
  hourlyRate: number;
  total: number;
  isBilled: boolean;
  invoiceId: string | null;
  createdAt: string;
}

export interface TimeEntryStats {
  totalHours: number;
  totalAmount: number;
  totalCount: number;
  monthHours: number;
  monthAmount: number;
  unbilledHours: number;
  unbilledAmount: number;
  unbilledCount: number;
}

// ─── Category Budget types ───────────────────────────────────────────────────

export interface CategoryBudget {
  id: string;
  category: string;
  amount: number;
  period: string;
  currentSpend: number;
  percentage: number;
}

// ─── Notification types ──────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

// ─── Forecast types ──────────────────────────────────────────────────────────

export interface ForecastMonth {
  month: string;
  projectedRevenue: number;
  projectedExpenses: number;
  projectedProfit: number;
}

// ─── IR Estimate types ───────────────────────────────────────────────────────

export interface IrEstimate {
  yearRevenue: number;
  activityType: string;
  abatement: number;
  taxableIncome: number;
  irEstimate: number;
  urssafDeductible: number;
  netAfterTax: number;
  disclaimer: string;
}

// ─── Client Stats types ─────────────────────────────────────────────────────

export interface ClientStats {
  totalRevenue: number;
  invoiceCount: number;
  paidCount: number;
  pendingCount: number;
  averagePaymentDays: number;
  topInvoice: number;
  monthlyRevenue: { month: string; revenue: number }[];
  lastInvoiceDate: string | null;
}

// ─── Expense types ────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'OFFICE_SUPPLIES' | 'TRAVEL' | 'MEALS' | 'EQUIPMENT' | 'SOFTWARE'
  | 'MARKETING' | 'PROFESSIONAL_FEES' | 'RENT' | 'UTILITIES'
  | 'INSURANCE' | 'TAXES' | 'SALARY' | 'OTHER';

export type RecurrenceInterval = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL';

export interface UserCategory {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  color: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  vatAmount: number;
  description: string | null;
  date: string;
  receiptUrl: string | null;
  supplier: string | null;
  isDeductible: boolean;
  isRecurring: boolean;
  recurrenceInterval: RecurrenceInterval | null;
  userCategoryId: string | null;
  userCategory: { name: string; color: string } | null;
  createdAt: string;
}

export interface ExpenseStats {
  total: number;
  vatTotal: number;
  count: number;
  byCategory: { category: ExpenseCategory; amount: number; vatAmount: number; count: number }[];
}

// ─── Revenue types ────────────────────────────────────────────────────────────

export type RevenueCategory =
  | 'SERVICES' | 'PRODUCTS' | 'CONSULTING' | 'FREELANCE'
  | 'SUBSCRIPTION' | 'RENTAL' | 'OTHER';

export interface Revenue {
  id: string;
  category: RevenueCategory;
  amount: number;
  vatAmount: number;
  description: string | null;
  date: string;
  clientName: string | null;
  isRecurring: boolean;
  recurrenceInterval: RecurrenceInterval | null;
  userCategoryId: string | null;
  userCategory: { name: string; color: string } | null;
  createdAt: string;
}

export interface RevenueStats {
  total: number;
  vatTotal: number;
  count: number;
  byCategory: { category: RevenueCategory; amount: number; vatAmount: number; count: number }[];
}

// ─── Tax report types ─────────────────────────────────────────────────────────

export type TaxReportType   = 'TVA' | 'IS' | 'IR' | 'URSSAF' | 'CFE' | 'OTHER';
export type TaxReportStatus = 'DRAFT' | 'SUBMITTED' | 'VALIDATED';

export interface TaxReport {
  id: string;
  type: TaxReportType;
  status: TaxReportStatus;
  periodStart: string;
  periodEnd: string;
  dueDate: string | null;
  submittedAt: string | null;
  amount: number;
  details: Record<string, number> | null;
  notes: string | null;
  createdAt: string;
}

export interface TaxPreview {
  amount: number;
  details: Record<string, number>;
}

// ─── Business & User types ────────────────────────────────────────────────────

export type BusinessType =
  | 'AUTO_ENTREPRENEUR' | 'EI' | 'EIRL' | 'EURL'
  | 'SARL' | 'SAS' | 'SASU' | 'SA' | 'OTHER';

export interface Business {
  id: string;
  userId: string;
  name: string;
  siret: string | null;
  siren: string | null;
  vatNumber: string | null;
  type: BusinessType;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  iban: string | null;
  bic: string | null;
  revenueGoal: number | null;
  isVatSubject: boolean;
  defaultVatRate: number;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionPlan = 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'TRIALING' | 'INACTIVE';

export interface Subscription {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  isVerified: boolean;
  createdAt: string;
  business?: Business | null;
  subscription?: Subscription | null;
}

// ─── Dashboard types ─────────────────────────────────────────────────────────

export interface MonthlyPoint {
  month: string; // "2024-01"
  revenue: number;
  expenses: number;
}

export interface InvoiceRow {
  id: string;
  number: string;
  client: string;
  amount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  issueDate: string;
  dueDate: string | null;
}

export interface TaxDeadline {
  id: string;
  type: string;
  dueDate: string;
  daysRemaining: number;
  amount: number;
  status: string;
}

export interface ExpenseCategoryData {
  category: string;
  amount: number;
  percentage: number;
  color?: string;
}

export interface UrssafQuarter {
  quarter: string;
  label: string;
  revenue: number;
  urssafEstimate: number;
}

export interface UrssafData {
  currentQuarterRevenue: number;
  urssafEstimate: number;
  quarter: string;
  periodLabel: string;
  declarationDeadline: string;
  daysUntilDeadline: number;
  previousQuarters: UrssafQuarter[];
}

export interface DashboardData {
  kpis: {
    currentMonth: {
      revenue: number;
      expenses: number;
      profit: number;
      invoiceCount: number;
      revenueGrowth: number | null;
      expensesGrowth: number | null;
    };
    currentYear: {
      revenue: number;
      expenses: number;
      profit: number;
      invoiceCount: number;
    };
    previousYear?: {
      revenue: number;
      expenses: number;
      profit: number;
      invoiceCount: number;
    };
    yearGrowth?: number | null;
  };
  invoiceStats: Record<string, { count: number; total: number }>;
  unpaidTotal: number;
  overdueTotal: number;
  recentInvoices: InvoiceRow[];
  taxDeadlines: TaxDeadline[];
  expenseBreakdown: ExpenseCategoryData[];
  revenueBreakdown: ExpenseCategoryData[];
  monthlyRevenue: MonthlyPoint[];
  threshold: {
    yearRevenue: number;
    limit: number;
    progress: number;
    isNearLimit: boolean;
  };
}
