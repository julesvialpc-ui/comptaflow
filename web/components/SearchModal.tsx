'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { eur } from '@/lib/format';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

interface Result {
  id: string;
  label: string;
  sub: string;
  href: string;
  type: 'invoice' | 'client' | 'expense' | 'quote';
}

const TYPE_ICONS: Record<Result['type'], React.ReactNode> = {
  invoice: (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="5" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="5" y1="9" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  client: (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M3 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  expense: (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="1" y1="7" x2="15" y2="7" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  quote: (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

const TYPE_LABELS: Record<Result['type'], string> = {
  invoice: 'Facture',
  quote: 'Devis',
  client: 'Client',
  expense: 'Dépense',
};

export default function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const id = setTimeout(async () => {
      setLoading(true);
      const token = localStorage.getItem('accessToken') ?? '';
      const h = { Authorization: `Bearer ${token}` };
      try {
        const [invRes, clientRes, quoteRes] = await Promise.all([
          fetch(`${API}/invoices?search=${encodeURIComponent(query)}`, { headers: h }).then(r => r.ok ? r.json() : []),
          fetch(`${API}/clients?search=${encodeURIComponent(query)}`, { headers: h }).then(r => r.ok ? r.json() : []),
          fetch(`${API}/quotes?search=${encodeURIComponent(query)}`, { headers: h }).then(r => r.ok ? r.json() : []),
        ]);

        const mapped: Result[] = [
          ...((invRes as any[]) ?? []).slice(0, 4).map((i: any) => ({
            id: i.id, type: 'invoice' as const,
            label: `Facture ${i.number}`,
            sub: `${i.client?.name ?? 'Sans client'} · ${eur(i.total)}`,
            href: `/invoices/${i.id}`,
          })),
          ...((quoteRes as any[]) ?? []).slice(0, 3).map((q: any) => ({
            id: q.id, type: 'quote' as const,
            label: `Devis ${q.number}`,
            sub: `${q.client?.name ?? 'Sans client'} · ${eur(q.total)}`,
            href: `/quotes/${q.id}`,
          })),
          ...((clientRes as any[]) ?? []).slice(0, 4).map((c: any) => ({
            id: c.id, type: 'client' as const,
            label: c.name,
            sub: c.email ?? c.city ?? '',
            href: `/clients/${c.id}`,
          })),
        ];
        setResults(mapped);
        setSelected(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) { navigate(results[selected].href); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden mx-4"
        style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '0.5px solid #E5E4E0' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: '#888780', flexShrink: 0 }}>
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher une facture, un client, un devis…"
            className="flex-1 text-[14px] outline-none"
            style={{ color: '#1a1a18', background: 'transparent' }}
          />
          <kbd className="hidden sm:flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px]" style={{ background: '#F5F5F3', color: '#888780', border: '0.5px solid #E5E4E0' }}>esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: '#378ADD', borderTopColor: 'transparent' }} />
            </div>
          )}
          {!loading && query && results.length === 0 && (
            <p className="px-4 py-6 text-center text-[13px]" style={{ color: '#888780' }}>Aucun résultat pour « {query} »</p>
          )}
          {!loading && !query && (
            <p className="px-4 py-6 text-center text-[13px]" style={{ color: '#888780' }}>Tapez pour rechercher…</p>
          )}
          {results.map((r, i) => (
            <button
              key={r.id + r.type}
              onClick={() => navigate(r.href)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
              style={{ background: i === selected ? '#F5F5F3' : 'transparent' }}
              onMouseEnter={() => setSelected(i)}
            >
              <span
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                style={{ background: '#E6F1FB', color: '#378ADD' }}
              >
                {TYPE_ICONS[r.type]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: '#1a1a18' }}>{r.label}</p>
                <p className="text-[11px] truncate" style={{ color: '#888780' }}>{r.sub}</p>
              </div>
              <span className="flex-shrink-0 text-[10px] font-medium rounded-full px-2 py-0.5" style={{ background: '#F5F5F3', color: '#888780' }}>
                {TYPE_LABELS[r.type]}
              </span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2" style={{ borderTop: '0.5px solid #E5E4E0', background: '#FAFAF9' }}>
          <span className="text-[11px]" style={{ color: '#888780' }}>
            <kbd className="rounded px-1 py-0.5" style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0' }}>↑↓</kbd> naviguer
          </span>
          <span className="text-[11px]" style={{ color: '#888780' }}>
            <kbd className="rounded px-1 py-0.5" style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0' }}>↵</kbd> ouvrir
          </span>
        </div>
      </div>
    </div>
  );
}
