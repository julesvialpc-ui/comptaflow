import { Employee, EmployeeStats, ContractType, Expense } from './types';
import { authFetch } from './auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export interface EmployeePayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  position?: string;
  contractType?: ContractType;
  grossSalary: number;
  startDate: string;
  endDate?: string | null;
  socialSecurityNumber?: string;
  iban?: string;
  isActive?: boolean;
  notes?: string;
}

export async function apiGetEmployees(token: string, search?: string): Promise<Employee[]> {
  const url = search
    ? `${API}/employees?search=${encodeURIComponent(search)}`
    : `${API}/employees`;
  const res = await authFetch(url, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiGetEmployee(token: string, id: string): Promise<Employee> {
  const res = await authFetch(`${API}/employees/${id}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiGetEmployeeStats(token: string): Promise<EmployeeStats> {
  const res = await authFetch(`${API}/employees/stats`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiCreateEmployee(token: string, dto: EmployeePayload): Promise<Employee> {
  const res = await authFetch(`${API}/employees`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Erreur lors de la création');
  }
  return res.json();
}

export async function apiUpdateEmployee(
  token: string,
  id: string,
  dto: Partial<EmployeePayload>,
): Promise<Employee> {
  const res = await authFetch(`${API}/employees/${id}`, {
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

export async function apiDeleteEmployee(token: string, id: string): Promise<void> {
  const res = await authFetch(`${API}/employees/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function apiGetEmployeeExpenses(token: string, employeeId: string): Promise<Expense[]> {
  const res = await authFetch(`${API}/employees/${employeeId}/expenses`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
