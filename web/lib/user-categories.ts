import { authFetch } from './auth';
import { UserCategory } from './types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function apiGetUserCategories(token: string, type?: 'EXPENSE' | 'REVENUE'): Promise<UserCategory[]> {
  const params = type ? `?type=${type}` : '';
  const res = await authFetch(`${API}/user-categories${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiCreateUserCategory(
  token: string,
  payload: { name: string; color?: string; type: 'EXPENSE' | 'REVENUE' },
): Promise<UserCategory> {
  const res = await authFetch(`${API}/user-categories`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiUpdateUserCategory(
  token: string,
  id: string,
  payload: { name?: string; color?: string },
): Promise<UserCategory> {
  const res = await authFetch(`${API}/user-categories/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiDeleteUserCategory(token: string, id: string): Promise<void> {
  const res = await authFetch(`${API}/user-categories/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 204) throw new Error(await res.text());
}
