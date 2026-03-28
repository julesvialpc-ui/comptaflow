import { Document } from './types';
import { authFetch } from './auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function apiGetDocuments(token: string): Promise<Document[]> {
  const res = await authFetch(`${API}/documents`, {
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiUploadDocument(
  token: string,
  file: File,
  name: string,
  category: string,
  notes?: string,
): Promise<Document> {
  const form = new FormData();
  form.append('file', file);
  form.append('name', name || file.name);
  form.append('category', category);
  if (notes) form.append('notes', notes);
  const res = await authFetch(`${API}/documents`, {
    method: 'POST',
    headers: authHeaders(token),
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiDeleteDocument(token: string, id: string): Promise<void> {
  const res = await authFetch(`${API}/documents/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(await res.text());
}
