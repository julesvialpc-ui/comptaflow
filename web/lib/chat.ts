import { authFetch } from './auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export async function apiGetHistory(token: string, limit = 60): Promise<ChatMessage[]> {
  const res = await authFetch(`${API}/chat/history?limit=${limit}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiClearHistory(token: string): Promise<void> {
  const res = await authFetch(`${API}/chat/history`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
}

export type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_calls'; tools: string[] }
  | { type: 'done' };

export async function apiStreamMessage(
  token: string,
  message: string,
  onEvent: (ev: StreamEvent) => void,
): Promise<void> {
  const res = await authFetch(`${API}/chat/ai/stream`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ message }),
  });

  if (!res.ok) throw new Error(await res.text());

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const ev: StreamEvent = JSON.parse(line.slice(6));
          onEvent(ev);
        } catch {
          // skip malformed
        }
      }
    }
  }
}
