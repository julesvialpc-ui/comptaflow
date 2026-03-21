import { CategoryBudget } from './types';
import { authFetch } from './auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function apiGetCategoryBudgets(token: string): Promise<CategoryBudget[]> {
  const res = await authFetch(`${API}/category-budgets`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Upsert ──────────────────────────────────────────────────────────────────

export async function apiUpsertCategoryBudget(
  token: string,
  data: { category: string; amount: number; period?: string },
): Promise<CategoryBudget> {
  const res = await authFetch(`${API}/category-budgets`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function apiDeleteCategoryBudget(token: string, id: string): Promise<void> {
  const res = await authFetch(`${API}/category-budgets/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
}
