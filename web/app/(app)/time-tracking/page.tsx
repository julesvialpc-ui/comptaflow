'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TimeEntry, Client } from '@/lib/types';
import {
  apiGetTimeEntries,
  apiGetTimeStats,
  apiCreateTimeEntry,
  apiUpdateTimeEntry,
  apiDeleteTimeEntry,
  apiGenerateInvoiceFromTime,
} from '@/lib/time-entries';
import { eur } from '@/lib/format';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tok() {
  return typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function monthRange(offset = 0) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + offset;
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 0, 23, 59, 59);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

// ─── TimeEntryForm ───────────────────────────────────────────────────────────

interface TimeEntryFormProps {
  initial?: TimeEntry;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
  clients: Client[];
}

function TimeEntryForm({ initial, onSave, onClose, clients }: TimeEntryFormProps) {
  const [clientId, setClientId] = useState(initial?.clientId ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(initial?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState(initial ? String(initial.hours) : '');
  const [hourlyRate, setHourlyRate] = useState(initial ? String(initial.hourlyRate) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const h = parseFloat(hours);
    const r = parseFloat(hourlyRate);
    if (!h || h <= 0) { setError('Heures invalides.'); return; }
    if (!r || r < 0) { setError('Taux horaire invalide.'); return; }
    setLoading(true);
    try {
      await onSave({
        clientId: clientId || null,
        description: description.trim(),
        date,
        hours: h,
        hourlyRate: r,
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
          {initial ? 'Modifier l\u2019entr\u00e9e' : 'Nouvelle entr\u00e9e'}
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
          <label className="block text-xs font-medium text-zinc-500">Client (optionnel)</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
            <option value="">Aucun client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-500">Description <span className="text-red-500">*</span></label>
          <input value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="T\u00e2che effectu\u00e9e\u2026" className={inputCls} required />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-500">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500">Heures <span className="text-red-500">*</span></label>
            <input type="number" min="0" step="0.5" value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="2.5" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500">Taux horaire (\u20ac/h) <span className="text-red-500">*</span></label>
            <input type="number" min="0" step="1" value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="50" className={inputCls} />
          </div>
        </div>

        {parseFloat(hours) > 0 && parseFloat(hourlyRate) > 0 && (
          <p className="text-xs text-zinc-400">
            Total : <span className="font-semibold text-zinc-700">{eur(parseFloat(hours) * parseFloat(hourlyRate))}</span>
          </p>
        )}
      </div>

      <div className="border-t border-zinc-100 px-5 py-4 flex gap-3">
        <button type="submit" disabled={loading}
          className="flex-1 rounded-lg bg-[#378ADD] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition disabled:opacity-60">
          {loading ? 'Enregistrement\u2026' : initial ? 'Mettre \u00e0 jour' : 'Ajouter'}
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

export default function TimeTrackingPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [stats, setStats] = useState<{ totalHours: number; totalAmount: number; unbilledHours: number; unbilledAmount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);

  // Filters
  const [clientFilter, setClientFilter] = useState('');
  const [billedFilter, setBilledFilter] = useState<'all' | 'billed' | 'unbilled'>('all');
  const [monthOffset, setMonthOffset] = useState(0);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Slide-over
  const [slider, setSlider] = useState<{ mode: 'create' } | { mode: 'edit'; entry: TimeEntry } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [invoicing, setInvoicing] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const t = tok();
    if (!t) { router.push('/login'); return; }
    fetch(`${API}/clients`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setClients)
      .catch(() => {});
  }, [router]);

  const load = useCallback(() => {
    const t = tok();
    if (!t) return;
    setLoading(true);
    const range = monthRange(monthOffset);
    const filters: { clientId?: string; isBilled?: boolean; startDate?: string; endDate?: string } = {
      startDate: range.from,
      endDate: range.to,
    };
    if (clientFilter) filters.clientId = clientFilter;
    if (billedFilter === 'billed') filters.isBilled = true;
    if (billedFilter === 'unbilled') filters.isBilled = false;

    Promise.all([
      apiGetTimeEntries(t, filters),
      apiGetTimeStats(t),
    ])
      .then(([list, s]) => { setEntries(list); setStats(s); setSelected(new Set()); })
      .finally(() => setLoading(false));
  }, [clientFilter, billedFilter, monthOffset]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSlider(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function handleSave(data: Record<string, unknown>) {
    const t = tok();
    if (slider?.mode === 'edit') {
      const updated = await apiUpdateTimeEntry(t, slider.entry.id, data);
      setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
    } else {
      const created = await apiCreateTimeEntry(t, data);
      setEntries(prev => [created, ...prev]);
    }
    setSlider(null);
    apiGetTimeStats(t).then(setStats).catch(() => {});
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette entr\u00e9e ?')) return;
    setDeleting(id);
    try {
      await apiDeleteTimeEntry(tok(), id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleInvoiceSelected() {
    const selectedEntries = entries.filter(e => selected.has(e.id) && !e.isBilled);
    if (selectedEntries.length === 0) return;
    // Group by client
    const clientIds = [...new Set(selectedEntries.map(e => e.clientId).filter(Boolean))] as string[];
    if (clientIds.length !== 1) {
      alert('S\u00e9lectionnez des entr\u00e9es pour un seul client.');
      return;
    }
    setInvoicing(true);
    try {
      await apiGenerateInvoiceFromTime(tok(), {
        clientId: clientIds[0],
        timeEntryIds: selectedEntries.map(e => e.id),
      });
      setToast('Facture g\u00e9n\u00e9r\u00e9e avec succ\u00e8s !');
      load();
    } catch {
      alert('Erreur lors de la facturation.');
    } finally {
      setInvoicing(false);
    }
  }

  const unbilledSelected = [...selected].filter(id => {
    const e = entries.find(en => en.id === id);
    return e && !e.isBilled;
  });

  const range = monthRange(monthOffset);
  const monthLabel = new Date(range.from).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="p-6 space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-medium" style={{ color: '#1a1a18' }}>Suivi du temps</h1>
          <p className="text-[12px] mt-0.5" style={{ color: '#888780' }}>{entries.length} entr\u00e9e{entries.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setSlider({ mode: 'create' })}
          className="flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-medium transition-opacity hover:opacity-80"
          style={{ background: '#378ADD', color: '#E6F1FB' }}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle entr\u00e9e
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Heures ce mois', value: `${stats?.totalHours?.toFixed(1) ?? '0'}h`, sub: 'total' },
          { label: 'CA facturable', value: eur(stats?.unbilledAmount ?? 0), sub: `${(stats?.unbilledHours ?? 0).toFixed(1)}h non factur\u00e9es` },
          { label: 'CA factur\u00e9', value: eur((stats?.totalAmount ?? 0) - (stats?.unbilledAmount ?? 0)), sub: 'factur\u00e9' },
        ].map(card => (
          <div key={card.label} className="rounded-lg p-4" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
            <p className="text-[11px] mb-1" style={{ color: '#888780' }}>{card.label}</p>
            <p className="text-[18px] font-medium" style={{ color: '#1a1a18' }}>{card.value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: '#888780' }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Month nav */}
        <div className="flex items-center gap-2">
          <button onClick={() => setMonthOffset(prev => prev - 1)} className="rounded p-1.5 hover:bg-zinc-100 transition" style={{ color: '#888780' }}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-[13px] font-medium min-w-[120px] text-center" style={{ color: '#1a1a18' }}>{monthLabel}</span>
          <button onClick={() => setMonthOffset(prev => prev + 1)} className="rounded p-1.5 hover:bg-zinc-100 transition" style={{ color: '#888780' }}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Client filter */}
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="rounded-md py-2 px-3 text-[13px] outline-none"
          style={{ border: '0.5px solid #E5E4E0', background: '#FFFFFF', color: '#1a1a18' }}
        >
          <option value="">Tous les clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Billed filter */}
        <div className="flex gap-1 rounded-md p-0.5" style={{ background: '#EDEDEB' }}>
          {([['all', 'Tout'], ['unbilled', 'Non factur\u00e9'], ['billed', 'Factur\u00e9']] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setBilledFilter(v)}
              className="rounded px-3 py-1.5 text-[12px] font-medium transition-colors"
              style={billedFilter === v ? { background: '#FFFFFF', color: '#1a1a18' } : { color: '#888780' }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Invoice selected */}
        {unbilledSelected.length > 0 && (
          <button
            onClick={handleInvoiceSelected}
            disabled={invoicing}
            className="flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-medium transition-opacity hover:opacity-80 disabled:opacity-60"
            style={{ background: '#3B6D11', color: '#FFFFFF' }}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Facturer la s\u00e9lection ({unbilledSelected.length})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[13px]" style={{ color: '#888780' }}>Chargement\u2026</div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg className="h-8 w-8" style={{ color: '#D3D1C7' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[13px]" style={{ color: '#888780' }}>Aucune entr\u00e9e de temps</p>
            <button onClick={() => setSlider({ mode: 'create' })} className="text-[13px] font-medium" style={{ color: '#378ADD' }}>
              Ajouter une entr\u00e9e
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '0.5px solid #E5E4E0', background: '#F8F8F7' }}>
                <th className="py-3 pl-4 pr-2 w-8">
                  <input
                    type="checkbox"
                    checked={entries.filter(e => !e.isBilled).length > 0 && entries.filter(e => !e.isBilled).every(e => selected.has(e.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected(new Set(entries.filter(en => !en.isBilled).map(en => en.id)));
                      } else {
                        setSelected(new Set());
                      }
                    }}
                    className="h-3.5 w-3.5 rounded border-zinc-300"
                  />
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-medium" style={{ color: '#888780' }}>Date</th>
                <th className="px-3 py-3 text-left text-[11px] font-medium" style={{ color: '#888780' }}>Client</th>
                <th className="px-3 py-3 text-left text-[11px] font-medium" style={{ color: '#888780' }}>Description</th>
                <th className="px-3 py-3 text-right text-[11px] font-medium" style={{ color: '#888780' }}>Heures</th>
                <th className="px-3 py-3 text-right text-[11px] font-medium" style={{ color: '#888780' }}>Taux/h</th>
                <th className="px-3 py-3 text-right text-[11px] font-medium" style={{ color: '#888780' }}>Total</th>
                <th className="px-3 py-3 text-center text-[11px] font-medium" style={{ color: '#888780' }}>Statut</th>
                <th className="py-3 pl-3 pr-4 text-right text-[11px] font-medium" style={{ color: '#888780' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.id}
                  className="group transition-colors"
                  style={{
                    borderBottom: i < entries.length - 1 ? '0.5px solid #F0F0EE' : undefined,
                    background: !entry.isBilled ? '#FAFAF8' : undefined,
                  }}
                >
                  <td className="py-3 pl-4 pr-2">
                    {!entry.isBilled && (
                      <input
                        type="checkbox"
                        checked={selected.has(entry.id)}
                        onChange={() => toggleSelect(entry.id)}
                        className="h-3.5 w-3.5 rounded border-zinc-300"
                      />
                    )}
                  </td>
                  <td className="px-3 py-3 text-[13px]" style={{ color: '#888780' }}>{fmtDate(entry.date)}</td>
                  <td className="px-3 py-3 text-[13px]" style={{ color: '#1a1a18' }}>
                    {entry.client?.name ?? <span className="italic" style={{ color: '#888780' }}>\u2014</span>}
                  </td>
                  <td className="px-3 py-3 text-[13px]" style={{ color: '#1a1a18' }}>
                    {entry.description || <span className="italic" style={{ color: '#888780' }}>\u2014</span>}
                  </td>
                  <td className="px-3 py-3 text-right text-[13px] font-medium tabular-nums" style={{ color: '#1a1a18' }}>
                    {entry.hours}h
                  </td>
                  <td className="px-3 py-3 text-right text-[13px]" style={{ color: '#888780' }}>
                    {eur(entry.hourlyRate)}
                  </td>
                  <td className="px-3 py-3 text-right text-[13px] font-medium tabular-nums" style={{ color: '#1a1a18' }}>
                    {eur(entry.total)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={entry.isBilled
                        ? { background: '#F0F9EC', color: '#3B6D11' }
                        : { background: '#FFFBEB', color: '#F59E0B' }
                      }
                    >
                      {entry.isBilled ? 'Factur\u00e9' : 'Non factur\u00e9'}
                    </span>
                  </td>
                  <td className="py-3 pl-3 pr-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => setSlider({ mode: 'edit', entry })}
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
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deleting === entry.id}
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
          <TimeEntryForm
            initial={slider.mode === 'edit' ? slider.entry : undefined}
            onSave={handleSave}
            onClose={() => setSlider(null)}
            clients={clients}
          />
        )}
      </div>
    </div>
  );
}
