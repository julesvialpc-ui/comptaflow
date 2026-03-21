import { Quote, QuoteStatus, Invoice } from './types';
import { authFetch } from './auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function apiGetQuotes(
  token: string,
  filters: { status?: QuoteStatus; clientId?: string; search?: string } = {},
): Promise<Quote[]> {
  const params = new URLSearchParams();
  if (filters.status)   params.set('status',   filters.status);
  if (filters.clientId) params.set('clientId', filters.clientId);
  if (filters.search)   params.set('search',   filters.search);
  const qs = params.toString();
  const res = await authFetch(`${API}/quotes${qs ? '?' + qs : ''}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Single ───────────────────────────────────────────────────────────────────

export async function apiGetQuote(token: string, id: string): Promise<Quote> {
  const res = await authFetch(`${API}/quotes/${id}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function apiCreateQuote(token: string, data: Record<string, unknown>): Promise<Quote> {
  const res = await authFetch(`${API}/quotes`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function apiUpdateQuote(token: string, id: string, data: Record<string, unknown>): Promise<Quote> {
  const res = await authFetch(`${API}/quotes/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function apiDeleteQuote(token: string, id: string): Promise<void> {
  const res = await authFetch(`${API}/quotes/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
}

// ─── Convert to Invoice ──────────────────────────────────────────────────────

export async function apiConvertQuoteToInvoice(token: string, id: string): Promise<Invoice> {
  const res = await authFetch(`${API}/quotes/${id}/convert`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
