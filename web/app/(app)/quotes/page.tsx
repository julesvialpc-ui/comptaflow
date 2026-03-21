'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Quote, QuoteStatus, Client } from '@/lib/types';
import { apiGetQuotes, apiCreateQuote, apiUpdateQuote, apiDeleteQuote, apiConvertQuoteToInvoice } from '@/lib/quotes';
import { eur } from '@/lib/format';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<QuoteStatus, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyé',
  ACCEPTED: 'Accepté',
  REJECTED: 'Refusé',
  EXPIRED: 'Expiré',
};

const STATUS_BG: Record<QuoteStatus, string> = {
  DRAFT: '#F5F5F3',
  SENT: '#E6F1FB',
  ACCEPTED: '#F0F9EC',
  REJECTED: '#FEF2F2',
  EXPIRED: '#FFFBEB',
};

const STATUS_TEXT: Record<QuoteStatus, string> = {
  DRAFT: '#888780',
  SENT: '#378ADD',
  ACCEPTED: '#3B6D11',
  REJECTED: '#DC2626',
  EXPIRED: '#F59E0B',
};

const TABS: { label: string; value: QuoteStatus | 'ALL' }[] = [
  { label: 'Tous',       value: 'ALL'      },
  { label: 'Brouillon',  value: 'DRAFT'    },
  { label: 'Envoyé',value: 'SENT'     },
  { label: 'Accepté',value: 'ACCEPTED' },
  { label: 'Refusé', value: 'REJECTED' },
  { label: 'Expiré', value: 'EXPIRED'  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tok() {
  return typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── QuoteForm ───────────────────────────────────────────────────────────────

interface QuoteFormProps {
  initial?: Quote;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
  clients: Client[];
}

interface FormItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

function QuoteForm({ initial, onSave, onClose, clients }: QuoteFormProps) {
  const [clientId, setClientId] = useState(initial?.clientId ?? '');
  const [status, setStatus] = useState<QuoteStatus>(initial?.status ?? 'DRAFT');
  const [expiryDate, setExpiryDate] = useState(initial?.expiryDate?.slice(0, 10) ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [items, setItems] = useState<FormItem[]>(
    initial?.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, vatRate: i.vatRate }))
    ?? [{ description: '', quantity: 1, unitPrice: 0, vatRate: 0.20 }],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function updateItem(idx: number, field: keyof FormItem, value: string | number) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const vatAmount = items.reduce((s, it) => s + it.quantity * it.unitPrice * it.vatRate, 0);
  const total = subtotal + vatAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (items.some(it => !it.description.trim())) { setError('Chaque ligne doit avoir une description.'); return; }
    setLoading(true);
    try {
      await onSave({
        clientId: clientId || null,
        status,
        expiryDate: expiryDate || null,
        notes: notes.trim() || null,
        items: items.map(it => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          vatRate: it.vatRate,
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#378ADD] focus:outline-none focus:ring-2 focus:ring-[#E6F1FB]';

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <h2 className="text-base font-semibold text-zinc-900">
          {initial ? 'Modifier le devis' : 'Nouveau devis'}
        </h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 transition">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-500">Client</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
            <option value="">Sans client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500">Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as QuoteStatus)} className={inputCls}>
              {(Object.keys(STATUS_LABEL) as QuoteStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500">Date d&apos;expiration</label>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputCls} />
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-zinc-500">Lignes du devis</label>
          {items.map((it, idx) => (
            <div key={idx} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">Ligne {idx + 1}</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)} className="text-xs text-red-400 hover:text-red-600">
                    Supprimer
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Description"
                value={it.description}
                onChange={(e) => updateItem(idx, 'description', e.target.value)}
                className={inputCls}
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-0.5">Qté</label>
                  <input type="number" min="1" step="1" value={it.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-0.5">Prix unit. HT</label>
                  <input type="number" min="0" step="0.01" value={it.unitPrice}
                    onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-0.5">TVA</label>
                  <select value={it.vatRate} onChange={(e) => updateItem(idx, 'vatRate', Number(e.target.value))} className={inputCls}>
                    <option value={0}>0 %</option>
                    <option value={0.20}>20 %</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-right text-zinc-500">
                Ligne: {eur(it.quantity * it.unitPrice * (1 + it.vatRate))}
              </p>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0, vatRate: 0.20 }])}
            className="flex items-center gap-1 text-sm font-medium text-[#378ADD] hover:underline"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter une ligne
          </button>
        </div>

        {/* Totals */}
        <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2.5 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Sous-total HT</span>
            <span className="font-medium text-zinc-700">{eur(subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">TVA</span>
            <span className="font-medium text-zinc-700">{eur(vatAmount)}</span>
          </div>
          <div className="flex justify-between text-xs border-t border-zinc-100 pt-1.5">
            <span className="text-zinc-500 font-medium">Total TTC</span>
            <span className="font-bold text-emerald-600">{eur(total)}</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-500">Notes</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Conditions, remarques..."
            className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#378ADD] focus:outline-none focus:ring-2 focus:ring-[#E6F1FB]" />
        </div>
      </div>

      <div className="border-t border-zinc-100 px-5 py-4 flex gap-3">
        <button type="submit" disabled={loading}
          className="flex-1 rounded-lg bg-[#378ADD] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition disabled:opacity-60">
          {loading ? 'Enregistrement…' : initial ? 'Mettre à jour' : 'Créer le devis'}
        </button>
        <button type="button" onClick={onClose}
          className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition">
          Annuler
        </button>
      </div>
    </form>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<QuoteStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [slider, setSlider] = useState<{ mode: 'create' } | { mode: 'edit'; quote: Quote } | null>(null);

  useEffect(() => {
    const t = tok();
    if (!t) { router.push('/login'); return; }
    // Fetch clients
    fetch(`${API}/clients`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setClients)
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    const t = tok();
    if (!t) return;
    setLoading(true);
    const filters: { status?: QuoteStatus; search?: string } = {};
    if (tab !== 'ALL') filters.status = tab;
    if (search) filters.search = search;
    apiGetQuotes(t, filters)
      .then(setQuotes)
      .finally(() => setLoading(false));
  }, [tab, search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSlider(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  async function handleSave(data: Record<string, unknown>) {
    const t = tok();
    if (slider?.mode === 'edit') {
      const updated = await apiUpdateQuote(t, slider.quote.id, data);
      setQuotes(prev => prev.map(q => q.id === updated.id ? updated : q));
    } else {
      const created = await apiCreateQuote(t, data);
      setQuotes(prev => [created, ...prev]);
    }
    setSlider(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce devis ? Cette action est irréversible.')) return;
    setDeleting(id);
    try {
      await apiDeleteQuote(tok(), id);
      setQuotes(prev => prev.filter(q => q.id !== id));
    } catch {
      alert('Erreur lors de la suppression.');
    } finally {
      setDeleting(null);
    }
  }

  async function handleConvert(id: string) {
    if (!confirm('Convertir ce devis en facture ?')) return;
    setConverting(id);
    try {
      await apiConvertQuoteToInvoice(tok(), id);
      // Refresh quotes
      const t = tok();
      const filters: { status?: QuoteStatus } = {};
      if (tab !== 'ALL') filters.status = tab;
      const updated = await apiGetQuotes(t, filters);
      setQuotes(updated);
      alert('Devis converti en facture avec succès.');
    } catch {
      alert('Erreur lors de la conversion.');
    } finally {
      setConverting(null);
    }
  }

  const totalQuotes = quotes.length;
  const pending = quotes.filter(q => q.status === 'DRAFT' || q.status === 'SENT').length;
  const accepted = quotes.filter(q => q.status === 'ACCEPTED').length;
  const totalAmount = quotes.reduce((s, q) => s + q.total, 0);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-medium" style={{ color: '#1a1a18' }}>Devis</h1>
          <p className="text-[12px] mt-0.5" style={{ color: '#888780' }}>{totalQuotes} devis</p>
        </div>
        <button
          onClick={() => setSlider({ mode: 'create' })}
          className="flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-medium transition-opacity hover:opacity-80"
          style={{ background: '#378ADD', color: '#E6F1FB' }}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau devis
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total devis', value: String(totalQuotes), sub: 'tous statuts' },
          { label: 'En attente', value: String(pending), sub: 'brouillons + envoyés' },
          { label: 'Acceptés', value: String(accepted), sub: 'devis validés' },
          { label: 'Montant total', value: eur(totalAmount), sub: 'TTC' },
        ].map(card => (
          <div key={card.label} className="rounded-lg p-4" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
            <p className="text-[11px] mb-1" style={{ color: '#888780' }}>{card.label}</p>
            <p className="text-[18px] font-medium" style={{ color: '#1a1a18' }}>{card.value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: '#888780' }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-md p-0.5 w-fit" style={{ background: '#EDEDEB' }}>
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className="rounded px-3 py-1.5 text-[12px] font-medium transition-colors"
            style={tab === t.value ? { background: '#FFFFFF', color: '#1a1a18' } : { color: '#888780' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-64">
        <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: '#888780' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 0 5 11a6 6 0 0 0 12 0z" />
        </svg>
        <input
          type="text"
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md py-2 pl-8 pr-3 text-[13px] outline-none"
          style={{ border: '0.5px solid #E5E4E0', background: '#FFFFFF', color: '#1a1a18' }}
          onFocus={e => { e.currentTarget.style.borderColor = '#378ADD'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#E5E4E0'; }}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[13px]" style={{ color: '#888780' }}>Chargement…</div>
        ) : quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg className="h-8 w-8" style={{ color: '#D3D1C7' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-[13px]" style={{ color: '#888780' }}>Aucun devis trouvé</p>
            <button onClick={() => setSlider({ mode: 'create' })} className="text-[13px] font-medium" style={{ color: '#378ADD' }}>
              Créer un devis
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '0.5px solid #E5E4E0', background: '#F8F8F7' }}>
                <th className="py-3 pl-4 pr-3 text-left text-[11px] font-medium" style={{ color: '#888780' }}>N°</th>
                <th className="px-3 py-3 text-left text-[11px] font-medium" style={{ color: '#888780' }}>Client</th>
                <th className="px-3 py-3 text-right text-[11px] font-medium" style={{ color: '#888780' }}>Montant TTC</th>
                <th className="px-3 py-3 text-center text-[11px] font-medium" style={{ color: '#888780' }}>Statut</th>
                <th className="px-3 py-3 text-left text-[11px] font-medium" style={{ color: '#888780' }}>Date émission</th>
                <th className="px-3 py-3 text-left text-[11px] font-medium" style={{ color: '#888780' }}>Date expiration</th>
                <th className="py-3 pl-3 pr-4 text-right text-[11px] font-medium" style={{ color: '#888780' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q, i) => (
                <tr key={q.id} className="group transition-colors" style={{ borderBottom: i < quotes.length - 1 ? '0.5px solid #F0F0EE' : undefined }}>
                  <td className="py-3 pl-4 pr-3 font-mono text-[12px] font-medium" style={{ color: '#888780' }}>
                    {q.number}
                  </td>
                  <td className="px-3 py-3 text-[13px]" style={{ color: '#1a1a18' }}>
                    {q.client?.name ?? <span className="italic" style={{ color: '#888780' }}>Sans client</span>}
                  </td>
                  <td className="px-3 py-3 text-right text-[13px] font-medium" style={{ color: '#1a1a18' }}>
                    {eur(q.total)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ background: STATUS_BG[q.status], color: STATUS_TEXT[q.status] }}
                    >
                      {STATUS_LABEL[q.status]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[13px]" style={{ color: '#888780' }}>{fmtDate(q.issueDate)}</td>
                  <td className="px-3 py-3 text-[13px]" style={{ color: '#888780' }}>{fmtDate(q.expiryDate)}</td>
                  <td className="py-3 pl-3 pr-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                      {/* Edit */}
                      <button
                        onClick={() => setSlider({ mode: 'edit', quote: q })}
                        className="rounded p-1.5 transition-colors"
                        style={{ color: '#888780' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5F5F3'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                        title="Modifier"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {/* Convert to Invoice (only ACCEPTED) */}
                      {q.status === 'ACCEPTED' && !q.convertedInvoiceId && (
                        <button
                          onClick={() => handleConvert(q.id)}
                          disabled={converting === q.id}
                          className="rounded p-1.5 transition-colors disabled:opacity-40"
                          style={{ color: '#378ADD' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E6F1FB'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                          title="Convertir en facture"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </button>
                      )}
                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(q.id)}
                        disabled={deleting === q.id}
                        className="rounded p-1.5 transition-colors disabled:opacity-40"
                        style={{ color: '#888780' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#A32D2D'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#888780'; }}
                        title="Supprimer"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide-over overlay */}
      {slider && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setSlider(null)} />
      )}

      {/* Slide-over panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-[460px] bg-white shadow-2xl transform transition-transform duration-200 ease-out ${
          slider ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {slider && (
          <QuoteForm
            initial={slider.mode === 'edit' ? slider.quote : undefined}
            onSave={handleSave}
            onClose={() => setSlider(null)}
            clients={clients}
          />
        )}
      </div>
    </div>
  );
}
