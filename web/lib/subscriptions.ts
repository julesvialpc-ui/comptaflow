import { authFetch } from './auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function headers(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function apiGetSubscription(token: string) {
  const res = await authFetch(`${API}/subscriptions/me`, { headers: headers(token) });
  if (!res.ok) return null;
  return res.json();
}

export async function apiCreateCheckout(token: string, plan: 'PRO' | 'BUSINESS'): Promise<{ url: string }> {
  const res = await authFetch(`${API}/subscriptions/checkout`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiCreatePortal(token: string): Promise<{ url: string }> {
  const res = await authFetch(`${API}/subscriptions/portal`, {
    method: 'POST',
    headers: headers(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
