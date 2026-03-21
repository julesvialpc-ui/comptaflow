import { Client } from './types';
import { authFetch } from './auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientWithStats extends Client {
  _count: { invoices: number };
}

export interface ClientDetail extends Client {
  totalRevenue: number;
  _count: { invoices: number };
  invoices: {
    id: string;
    number: string;
    status: string;
    total: number;
    issueDate: string;
    dueDate: string | null;
  }[];
}

export type ClientPayload = Omit<Client, 'id' | 'isActive'> & { isActive?: boolean };

// ─── API calls ────────────────────────────────────────────────────────────────

export async function apiGetClients(token: string, search?: string): Promise<ClientWithStats[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await authFetch(`${API}/clients${qs}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiGetClient(token: string, id: string): Promise<ClientDetail> {
  const res = await authFetch(`${API}/clients/${id}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiCreateClient(token: string, payload: ClientPayload): Promise<Client> {
  const res = await authFetch(`${API}/clients`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiUpdateClient(
  token: string,
  id: string,
  payload: Partial<ClientPayload>,
): Promise<Client> {
  const res = await authFetch(`${API}/clients/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiToggleActive(token: string, id: string): Promise<Client> {
  const res = await authFetch(`${API}/clients/${id}/toggle-active`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiDeleteClient(token: string, id: string): Promise<void> {
  const res = await authFetch(`${API}/clients/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
}
