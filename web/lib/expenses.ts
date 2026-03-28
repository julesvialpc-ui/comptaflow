import { Expense, ExpenseCategory, ExpenseStats, RecurrenceInterval } from './types';
import { authFetch } from './auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export interface ExpenseFilters {
  category?: ExpenseCategory;
  search?: string;
  from?: string;
  to?: string;
  deductible?: boolean;
}

export interface ExpensePayload {
  category?: ExpenseCategory;
  amount: number;
  vatAmount?: number;
  description?: string;
  date?: string;
  supplier?: string;
  receiptUrl?: string;
  isDeductible?: boolean;
  isRecurring?: boolean;
  recurrenceInterval?: RecurrenceInterval | null;
  userCategoryId?: string | null;
  employeeId?: string | null;
}

export async function apiGetExpenses(token: string, filters: ExpenseFilters = {}): Promise<Expense[]> {
  const params = new URLSearchParams();
  if (filters.category)              params.set('category',   filters.category);
  if (filters.search)                params.set('search',     filters.search);
  if (filters.from)                  params.set('from',       filters.from);
  if (filters.to)                    params.set('to',         filters.to);
  if (filters.deductible !== undefined) params.set('deductible', String(filters.deductible));
  const qs = params.toString();
  const res = await authFetch(`${API}/expenses${qs ? '?' + qs : ''}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiGetExpenseStats(
  token: string,
  from?: string,
  to?: string,
): Promise<ExpenseStats> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to)   params.set('to',   to);
  const qs = params.toString();
  const res = await authFetch(`${API}/expenses/stats${qs ? '?' + qs : ''}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiCreateExpense(token: string, payload: ExpensePayload): Promise<Expense> {
  const res = await authFetch(`${API}/expenses`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiUpdateExpense(
  token: string,
  id: string,
  payload: Partial<ExpensePayload>,
): Promise<Expense> {
  const res = await authFetch(`${API}/expenses/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiDeleteExpense(token: string, id: string): Promise<void> {
  const res = await authFetch(`${API}/expenses/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
}

export interface ReceiptAnalysis {
  receiptUrl: string;
  supplier?: string;
  date?: string;
  amountTTC?: number;
  vatAmount?: number;
  category?: ExpenseCategory;
  description?: string;
}

export async function apiAnalyzeReceipt(token: string, file: File): Promise<ReceiptAnalysis> {
  const form = new FormData();
  form.append('file', file);
  const res = await authFetch(`${API}/expenses/analyze-receipt`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
