import { AppNotification } from './types';
import { authFetch } from './auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function apiGetNotifications(token: string): Promise<AppNotification[]> {
  const res = await authFetch(`${API}/notifications`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Mark Read ────────────────────────────────────────────────────────────────

export async function apiMarkNotificationRead(token: string, id: string): Promise<void> {
  const res = await authFetch(`${API}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
}

// ─── Mark All Read ──────────────────────────────────────────────────────────

export async function apiMarkAllNotificationsRead(token: string): Promise<void> {
  const res = await authFetch(`${API}/notifications/read-all`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
}

// ─── Generate ────────────────────────────────────────────────────────────────

export async function apiGenerateNotifications(token: string): Promise<void> {
  const res = await authFetch(`${API}/notifications/generate`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
}
