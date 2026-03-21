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

// ─── Expense types ────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'OFFICE_SUPPLIES' | 'TRAVEL' | 'MEALS' | 'EQUIPMENT' | 'SOFTWARE'
  | 'MARKETING' | 'PROFESSIONAL_FEES' | 'RENT' | 'UTILITIES'
  | 'INSURANCE' | 'TAXES' | 'SALARY' | 'OTHER';

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
