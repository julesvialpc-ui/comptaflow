const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserSubscription {
  plan: 'FREE' | 'PRO' | 'BUSINESS';
  status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'TRIALING' | 'INACTIVE';
  trialEndsAt?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  businessId: string | null;
  role: string;
  subscription?: UserSubscription | null;
}

export function getActivePlan(user: AuthUser | null): 'FREE' | 'PRO' | 'BUSINESS' {
  if (!user?.subscription) return 'FREE';
  if (user.subscription.status === 'ACTIVE' || user.subscription.status === 'TRIALING') {
    return user.subscription.plan;
  }
  return 'FREE';
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name?: string;
  businessName: string;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export function saveTokens(tokens: AuthTokens) {
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

// ─── Token refresh ────────────────────────────────────────────────────────────

let _refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    if (!res.ok) return null;
    const data: AuthTokens = await res.json();
    saveTokens(data);
    return data.accessToken;
  } catch {
    return null;
  }
}

// Single in-flight refresh to avoid parallel refresh calls
async function refreshAccessToken(): Promise<string | null> {
  if (!_refreshPromise) {
    _refreshPromise = doRefresh().finally(() => { _refreshPromise = null; });
  }
  return _refreshPromise;
}

// ─── Authenticated fetch with auto-refresh ────────────────────────────────────
// Caller still passes Authorization header (or not). On 401, we refresh and retry.

export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  let res = await fetch(input, { ...init, cache: init.cache ?? 'no-store' });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(input, { ...init, headers, cache: init.cache ?? 'no-store' });
    } else {
      clearTokens();
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
  }

  return res;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function apiLogin(payload: LoginPayload): Promise<{ user: AuthUser } & AuthTokens> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Identifiants invalides');
  }
  return res.json();
}

export async function apiRegister(payload: RegisterPayload): Promise<{ user: AuthUser } & AuthTokens> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = Array.isArray(body.message) ? body.message[0] : (body.message ?? 'Erreur lors de l\'inscription');
    throw new Error(msg);
  }
  return res.json();
}

export async function apiMe(token: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Session expirée');
  return res.json();
}

export async function apiLogout(token: string): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}
