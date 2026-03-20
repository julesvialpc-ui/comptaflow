import { TaxReport, TaxReportStatus, TaxReportType, TaxPreview } from './types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export interface TaxReportPayload {
  type: TaxReportType;
  status?: TaxReportStatus;
  periodStart: string;
  periodEnd: string;
  dueDate?: string;
  amount?: number;
  details?: Record<string, number>;
  notes?: string;
}

export async function apiGetTaxReports(
  token: string,
  filters: { type?: TaxReportType; status?: TaxReportStatus } = {},
): Promise<TaxReport[]> {
  const params = new URLSearchParams();
  if (filters.type)   params.set('type',   filters.type);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  const res = await fetch(`${API}/tax-reports${qs ? '?' + qs : ''}`, {
    headers: authHeaders(token), cache: 'no-store',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiGetUpcoming(token: string): Promise<TaxReport[]> {
  const res = await fetch(`${API}/tax-reports/upcoming`, {
    headers: authHeaders(token), cache: 'no-store',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPreview(
  token: string,
  type: TaxReportType,
  periodStart: string,
  periodEnd: string,
): Promise<TaxPreview> {
  const params = new URLSearchParams({ type, periodStart, periodEnd });
  const res = await fetch(`${API}/tax-reports/preview?${params}`, {
    headers: authHeaders(token), cache: 'no-store',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiCreateTaxReport(token: string, payload: TaxReportPayload): Promise<TaxReport> {
  const res = await fetch(`${API}/tax-reports`, {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiUpdateTaxReport(
  token: string, id: string, payload: Partial<TaxReportPayload>,
): Promise<TaxReport> {
  const res = await fetch(`${API}/tax-reports/${id}`, {
    method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiUpdateTaxStatus(
  token: string, id: string, status: TaxReportStatus,
): Promise<TaxReport> {
  const res = await fetch(`${API}/tax-reports/${id}/status`, {
    method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiDeleteTaxReport(token: string, id: string): Promise<void> {
  const res = await fetch(`${API}/tax-reports/${id}`, {
    method: 'DELETE', headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
}

export function getExpenseReportPdfUrl(from: string, to: string): string {
  return `${API}/tax-reports/expense-report/pdf?from=${from}&to=${to}`;
}
