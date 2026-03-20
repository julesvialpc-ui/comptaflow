import { UserProfile, Business, BusinessType } from './types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function apiGetProfile(token: string): Promise<UserProfile> {
  const res = await fetch(`${API}/auth/me`, { headers: authHeaders(token), cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiUpdateProfile(token: string, dto: { name?: string }): Promise<UserProfile> {
  const res = await fetch(`${API}/auth/me`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Erreur lors de la mise à jour');
  }
  return res.json();
}

export async function apiChangePassword(
  token: string,
  dto: { currentPassword: string; newPassword: string },
): Promise<{ message: string }> {
  const res = await fetch(`${API}/auth/change-password`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Erreur lors du changement de mot de passe');
  }
  return res.json();
}

// ─── Business ─────────────────────────────────────────────────────────────────

export interface BusinessPayload {
  name?: string;
  siret?: string;
  siren?: string;
  vatNumber?: string;
  type?: BusinessType;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  website?: string;
  iban?: string;
  bic?: string;
  revenueGoal?: number | null;
}

export async function apiGetBusiness(token: string): Promise<Business | null> {
  const res = await fetch(`${API}/businesses/me`, { headers: authHeaders(token), cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiUpdateBusiness(token: string, dto: BusinessPayload): Promise<Business> {
  const res = await fetch(`${API}/businesses/me`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Erreur lors de la mise à jour');
  }
  return res.json();
}
