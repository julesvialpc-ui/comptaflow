import { TimeEntry, Invoice } from './types';
import { authFetch } from './auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function apiGetTimeEntries(
  token: string,
  filters: { clientId?: string; isBilled?: boolean; startDate?: string; endDate?: string } = {},
): Promise<TimeEntry[]> {
  const params = new URLSearchParams();
  if (filters.clientId)  params.set('clientId',  filters.clientId);
  if (filters.isBilled !== undefined) params.set('isBilled', String(filters.isBilled));
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate)   params.set('endDate',   filters.endDate);
  const qs = params.toString();
  const res = await authFetch(`${API}/time-entries${qs ? '?' + qs : ''}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function apiGetTimeStats(
  token: string,
): Promise<{ totalHours: number; totalAmount: number; unbilledHours: number; unbilledAmount: number }> {
  const res = await authFetch(`${API}/time-entries/stats`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function apiCreateTimeEntry(token: string, data: Record<string, unknown>): Promise<TimeEntry> {
  const res = await authFetch(`${API}/time-entries`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function apiUpdateTimeEntry(token: string, id: string, data: Record<string, unknown>): Promise<TimeEntry> {
  const res = await authFetch(`${API}/time-entries/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function apiDeleteTimeEntry(token: string, id: string): Promise<void> {
  const res = await authFetch(`${API}/time-entries/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
}

// ─── Generate Invoice from Time Entries ──────────────────────────────────────

export async function apiGenerateInvoiceFromTime(
  token: string,
  data: { clientId: string; timeEntryIds: string[] },
): Promise<Invoice> {
  const res = await authFetch(`${API}/time-entries/generate-invoice`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
