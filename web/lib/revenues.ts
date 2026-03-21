import { authFetch } from './auth';
import { Revenue, RevenueStats, RevenueCategory, RecurrenceInterval } from './types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export interface RevenueFilters {
  category?: RevenueCategory;
  search?: string;
  from?: string;
  to?: string;
}

export interface RevenuePayload {
  category?: RevenueCategory;
  amount: number;
  vatAmount?: number;
  description?: string;
  clientName?: string;
  date?: string;
  isRecurring?: boolean;
  recurrenceInterval?: RecurrenceInterval | null;
  userCategoryId?: string | null;
}

export async function apiGetRevenues(token: string, filters: RevenueFilters = {}): Promise<Revenue[]> {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.search)   params.set('search', filters.search);
  if (filters.from)     params.set('from', filters.from);
  if (filters.to)       params.set('to', filters.to);
  const res = await authFetch(`${API}/revenues?${params}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiGetRevenueStats(token: string, from?: string, to?: string): Promise<RevenueStats> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to)   params.set('to', to);
  const res = await authFetch(`${API}/revenues/stats?${params}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiCreateRevenue(token: string, payload: RevenuePayload): Promise<Revenue> {
  const res = await authFetch(`${API}/revenues`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiUpdateRevenue(token: string, id: string, payload: RevenuePayload): Promise<Revenue> {
  const res = await authFetch(`${API}/revenues/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiDeleteRevenue(token: string, id: string): Promise<void> {
  const res = await authFetch(`${API}/revenues/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 204) throw new Error(await res.text());
}
