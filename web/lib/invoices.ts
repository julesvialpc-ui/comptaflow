import { Invoice, InvoiceStatus } from './types';
import { authFetch } from './auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function apiGetInvoices(
  token: string,
  filters: { status?: InvoiceStatus; clientId?: string; from?: string; to?: string } = {},
): Promise<Invoice[]> {
  const params = new URLSearchParams();
  if (filters.status)   params.set('status',   filters.status);
  if (filters.clientId) params.set('clientId', filters.clientId);
  if (filters.from)     params.set('from',     filters.from);
  if (filters.to)       params.set('to',       filters.to);
  const qs = params.toString();
  const res = await authFetch(`${API}/invoices${qs ? '?' + qs : ''}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Single ───────────────────────────────────────────────────────────────────

export async function apiGetInvoice(token: string, id: string): Promise<Invoice> {
  const res = await authFetch(`${API}/invoices/${id}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Next number ──────────────────────────────────────────────────────────────

export async function apiNextInvoiceNumber(token: string): Promise<string> {
  const res = await authFetch(`${API}/invoices/next-number`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.number;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateInvoicePayload {
  number: string;
  clientId?: string;
  status?: InvoiceStatus;
  issueDate?: string;
  dueDate?: string;
  vatRate?: number;
  notes?: string;
  paymentTerms?: string;
  items: { description: string; quantity: number; unitPrice: number; vatRate?: number }[];
}

export async function apiCreateInvoice(token: string, payload: CreateInvoicePayload): Promise<Invoice> {
  const res = await authFetch(`${API}/invoices`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function apiUpdateInvoice(
  token: string,
  id: string,
  payload: Partial<CreateInvoicePayload>,
): Promise<Invoice> {
  const res = await authFetch(`${API}/invoices/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Update status ────────────────────────────────────────────────────────────

export async function apiUpdateStatus(
  token: string,
  id: string,
  status: InvoiceStatus,
): Promise<Invoice> {
  const res = await authFetch(`${API}/invoices/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function apiDeleteInvoice(token: string, id: string): Promise<void> {
  const res = await authFetch(`${API}/invoices/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
}

// ─── PDF download ─────────────────────────────────────────────────────────────

export function getPdfUrl(id: string): string {
  return `${API}/invoices/${id}/pdf`;
}
