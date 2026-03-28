'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Revenue, RevenueCategory, RevenueStats, RecurrenceInterval, UserCategory } from '@/lib/types';
import {
  apiGetRevenues,
  apiGetRevenueStats,
  apiCreateRevenue,
  apiUpdateRevenue,
  apiDeleteRevenue,
  RevenuePayload,
} from '@/lib/revenues';
import { apiGetUserCategories } from '@/lib/user-categories';
import { eur, exportCsv } from '@/lib/format';

// ─── Category config ──────────────────────────────────────────────────────────

const CAT: Record<RevenueCategory, { label: string; color: string }> = {
  SERVICES:     { label: 'Services',     color: 'bg-blue-100 text-blue-700'      },
  PRODUCTS:     { label: 'Produits',     color: 'bg-emerald-100 text-emerald-700'},
  CONSULTING:   { label: 'Conseil',      color: 'bg-violet-100 text-violet-700'  },
  FREELANCE:    { label: 'Freelance',    color: 'bg-amber-100 text-amber-700'    },
  SUBSCRIPTION: { label: 'Abonnements', color: 'bg-teal-100 text-teal-700'      },
  RENTAL:       { label: 'Location',    color: 'bg-orange-100 text-orange-700'  },
  OTHER:        { label: 'Autre',       color: 'bg-zinc-100 text-zinc-600'      },
};

const CATEGORIES = Object.keys(CAT) as RevenueCategory[];

const RECURRENCE_LABELS: Record<RecurrenceInterval, string> = {
  WEEKLY:      'Hebdomadaire',
  MONTHLY:     'Mensuel',
  QUARTERLY:   'Trimestriel',
  SEMI_ANNUAL: 'Semestriel',
};

function tok() {
  return typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { from: from.toISOString(), to: to.toISOString() };
}

function yearRange() {
  const y = new Date().getFullYear();
  return { from: new Date(y, 0, 1).toISOString(), to: new Date(y, 11, 31, 23, 59, 59).toISOString() };
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface RevenueFormProps {
  initial?: Revenue;
  onSave: (payload: RevenuePayload) => Promise<void>;
  onClose: () => void;
  userCategories: UserCategory[];
}

function RevenueForm({ initial, onSave, onClose, userCategories }: RevenueFormProps) {
  const getInitialSelection = () => {
    if (initial?.userCategoryId) return `CUSTOM:${initial.userCategoryId}`;
    return `BUILTIN:${initial?.category ?? 'SERVICES'}`;
  };

  const [selection, setSelection]         = useState(getInitialSelection());
  const [amount, setAmount]               = useState(initial ? String(initial.amount) : '');
  const [vatAmount, setVatAmount]         = useState(initial ? String(initial.vatAmount) : '0');
  const [description, setDescription]     = useState(initial?.description ?? '');
  const [clientName, setClientName]       = useState(initial?.clientName ?? '');
  const [date, setDate]                   = useState(
    initial ? initial.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [isRecurring, setIsRecurring]     = useState(initial?.isRecurring ?? false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>(
    initial?.recurrenceInterval ?? 'MONTHLY',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const isCustom = selection.startsWith('CUSTOM:');
  const builtinCategory = isCustom ? 'SERVICES' : (selection.replace('BUILTIN:', '') as RevenueCategory);
  const ttc = (parseFloat(amount) || 0) + (parseFloat(vatAmount) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Montant invalide.'); return; }
    setLoading(true);
    try {
      await onSave({
        category: builtinCategory,
        amount: amt,
        vatAmount: parseFloat(vatAmount) || 0,
        description: description.trim() || undefined,
        clientName:  clientName.trim()  || undefined,
        date:        date               || undefined,
        isRecurring,
        recurrenceInterval: isRecurring ? recurrenceInterval : null,
        userCategoryId: isCustom ? selection.replace('CUSTOM:', '') : null,
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
          {initial ? 'Modifier le revenu' : 'Nouveau revenu'}
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
          <label className="block text-xs font-medium text-zinc-500">Catégorie</label>
          <select value={selection} onChange={(e) => setSelection(e.target.value)} className={inputCls}>
            {userCategories.length > 0 && (
              <optgroup label="Mes catégories">
                {userCategories.map((uc) => (
                  <option key={uc.id} value={`CUSTOM:${uc.id}`}>{uc.name}</option>
                ))}
              </optgroup>
            )}
            <optgroup label="Catégories standard">
              {CATEGORIES.map((c) => <option key={c} value={`BUILTIN:${c}`}>{CAT[c].label}</option>)}
            </optgroup>
          </select>
          {isCustom && (() => {
            const uc = userCategories.find(u => u.id === selection.replace('CUSTOM:', ''));
            return uc ? (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: uc.color }} />
                <span className="text-xs text-zinc-500">{uc.name}</span>
              </div>
            ) : null;
          })()}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500">Montant HT (€) <span className="text-red-500">*</span></label>
            <input type="number" min="0" step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500">TVA collectée (€)</label>
            <input type="number" min="0" step="0.01" value={vatAmount}
              onChange={(e) => setVatAmount(e.target.value)}
              placeholder="0.00" className={inputCls} />
          </div>
        </div>

        {parseFloat(amount) > 0 && (
          <p className="text-xs text-zinc-400">
            Total TTC : <span className="font-semibold text-zinc-700">{eur(ttc)}</span>
          </p>
        )}

        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-500">Client</label>
          <input value={clientName} onChange={(e) => setClientName(e.target.value)}
            placeholder="Nom du client…" className={inputCls} />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-500">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-500">Description</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Détails du revenu…"
            className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#378ADD] focus:outline-none focus:ring-2 focus:ring-[#E6F1FB]" />
        </div>

        {/* Recurring */}
        <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 hover:bg-zinc-100 transition">
          <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-[#378ADD] focus:ring-[#E6F1FB]" />
          <div>
            <p className="text-sm font-medium text-zinc-700">Revenu récurrent</p>
            <p className="text-xs text-zinc-400">Se répète régulièrement</p>
          </div>
        </label>

        {isRecurring && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500">Fréquence</label>
            <select value={recurrenceInterval} onChange={(e) => setRecurrenceInterval(e.target.value as RecurrenceInterval)}
              className={inputCls}>
              {(Object.keys(RECURRENCE_LABELS) as RecurrenceInterval[]).map((r) => (
                <option key={r} value={r}>{RECURRENCE_LABELS[r]}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-100 px-5 py-4 flex gap-3">
        <button type="submit" disabled={loading}
          className="flex-1 rounded-lg bg-[#378ADD] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition disabled:opacity-60">
          {loading ? 'Enregistrement…' : initial ? 'Mettre à jour' : 'Ajouter le revenu'}
        </button>
        <button type="button" onClick={onClose}
          className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition">
          Annuler
        </button>
      </div>
    </form>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RevenuesPage() {
  const router = useRouter();
  const [revenues, setRevenues]   = useState<Revenue[]>([]);
  const [stats, setStats]         = useState<RevenueStats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory]   = useState<RevenueCategory | 'ALL'>('ALL');
  const [period, setPeriod]       = useState<'month' | 'year' | 'all'>('month');
  const [slider, setSlider]       = useState<{ mode: 'create' } | { mode: 'edit'; revenue: Revenue } | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);

  useEffect(() => {
    const t = tok();
    if (!t) return;
    apiGetUserCategories(t, 'REVENUE').then(setUserCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const dateRange = period === 'month' ? monthRange() : period === 'year' ? yearRange() : {};

  const load = useCallback(() => {
    const t = tok();
    if (!t) { router.push('/login'); return; }
    setLoading(true);
    const filters = {
      category: activeCategory !== 'ALL' ? activeCategory : undefined,
      search:   debouncedSearch || undefined,
      from:     (dateRange as { from?: string }).from,
      to:       (dateRange as { to?: string }).to,
    };
    Promise.all([
      apiGetRevenues(t, filters),
      apiGetRevenueStats(t, (dateRange as { from?: string }).from, (dateRange as { to?: string }).to),
    ])
      .then(([list, s]) => { setRevenues(list); setStats(s); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, debouncedSearch, period, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSlider(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  async function handleSave(payload: RevenuePayload) {
    const t = tok();
    if (slider?.mode === 'edit') {
      const updated = await apiUpdateRevenue(t, slider.revenue.id, payload);
      setRevenues((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } else {
      const created = await apiCreateRevenue(t, payload);
      setRevenues((prev) => [created, ...prev]);
    }
    setSlider(null);
    apiGetRevenueStats(t, (dateRange as { from?: string }).from, (dateRange as { to?: string }).to)
      .then(setStats);
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce revenu ?')) return;
    setDeleting(id);
    try {
      await apiDeleteRevenue(tok(), id);
      setRevenues((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  const total    = stats?.total    ?? 0;
  const vatTotal = stats?.vatTotal ?? 0;
  const count    = stats?.count    ?? 0;
  const periodLabel = period === 'month' ? 'ce mois' : period === 'year' ? 'cette année' : 'toutes périodes';

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <header className="border-b border-[#E5E4E0] bg-white px-4 py-4 -mx-4 sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Revenus</h1>
            <p className="text-sm text-zinc-500">{count} revenu{count !== 1 ? 's' : ''} · {periodLabel}</p>
          </div>
          <button
            onClick={() => setSlider({ mode: 'create' })}
            className="flex items-center gap-2 rounded-lg bg-[#378ADD] px-4 py-2 text-sm font-semibold text-white hover:opacity-80 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Nouveau revenu</span>
            <span className="sm:hidden">Nouveau</span>
          </button>
        </div>
      </header>

      <main className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: `Total HT (${periodLabel})`,  value: eur(total),      sub: `dont ${eur(vatTotal)} de TVA collectée` },
            { label: 'Revenus',                     value: String(count),   sub: 'transactions'                            },
            { label: 'Moy. par revenu',             value: count ? eur(total / count) : '—', sub: 'montant moyen HT'     },
            { label: 'TVA collectée',               value: eur(vatTotal),   sub: `taux moyen ${total > 0 ? Math.round(vatTotal / total * 100) : 0} %` },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-[#E5E4E0] bg-white px-5 py-4">
              <p className="text-xs font-medium text-zinc-400 mb-1">{card.label}</p>
              <p className="text-xl font-bold text-zinc-900 tabular-nums">{card.value}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
          <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 w-full sm:w-fit">
            {(['month', 'year', 'all'] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`flex-1 sm:flex-none rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  period === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}>
                {p === 'month' ? 'Ce mois' : p === 'year' ? 'Cette année' : 'Tout'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 0 5 11a6 6 0 0 0 12 0z" />
              </svg>
              <input type="text" placeholder="Description, client…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-[#E5E4E0] bg-white py-2 pl-9 pr-3 text-sm placeholder-zinc-400 focus:border-[#378ADD] focus:outline-none focus:ring-2 focus:ring-[#E6F1FB]" />
            </div>
            {revenues.length > 0 && (
              <button
                onClick={() => {
                  const periodLabel = period === 'month' ? 'ce_mois' : period === 'year' ? 'cette_année' : 'tout';
                  const header = ['Date', 'Description', 'Client', 'Catégorie', 'Montant HT', 'TVA', 'TTC', 'Récurrent'];
                  const rows = revenues.map((r) => [
                    new Date(r.date).toLocaleDateString('fr-FR'),
                    r.description ?? '',
                    r.clientName ?? '',
                    CAT[r.category]?.label ?? r.category,
                    r.amount.toFixed(2).replace('.', ','),
                    r.vatAmount.toFixed(2).replace('.', ','),
                    (r.amount + r.vatAmount).toFixed(2).replace('.', ','),
                    r.isRecurring ? 'Oui' : 'Non',
                  ]);
                  exportCsv(`revenus_${periodLabel}.csv`, [header, ...rows]);
                }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition flex-shrink-0"
                style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#6B6868' }}
                title="Exporter en CSV (Excel)"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v9M4 7l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="2" y="12" width="12" height="2.5" rx="1" fill="currentColor" opacity=".3"/>
                </svg>
                CSV
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveCategory('ALL')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              activeCategory === 'ALL' ? 'bg-[#378ADD] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}>
            Toutes
          </button>
          {(stats?.byCategory ?? []).map(({ category, amount: amt }) => (
            <button key={category}
              onClick={() => setActiveCategory(activeCategory === category ? 'ALL' : category)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                activeCategory === category ? 'bg-[#378ADD] text-white' : `${CAT[category].color} hover:opacity-80`
              }`}>
              {CAT[category].label} · {eur(amt)}
            </button>
          ))}
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-zinc-400">Chargement…</div>
          ) : revenues.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl py-12 gap-3" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
              <p className="text-sm text-zinc-400">Aucun revenu sur cette période</p>
              <button onClick={() => setSlider({ mode: 'create' })} className="text-sm font-medium text-[#378ADD]">Ajouter un revenu</button>
            </div>
          ) : revenues.map((rev) => (
            <div key={rev.id} className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] tabular-nums" style={{ color: '#C8C6C2' }}>{fmtDate(rev.date)}</span>
                    {rev.userCategory ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0 text-[10px] font-medium bg-zinc-100 text-zinc-600">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: rev.userCategory.color }} />
                        {rev.userCategory.name}
                      </span>
                    ) : (
                      <span className={`inline-flex rounded-full px-2 py-0 text-[10px] font-medium ${CAT[rev.category].color}`}>{CAT[rev.category].label}</span>
                    )}
                  </div>
                  <p className="text-[15px] font-semibold truncate" style={{ color: '#1a1a18' }}>{rev.description || '—'}</p>
                  {rev.clientName && <p className="text-[12px] mt-0.5" style={{ color: '#888780' }}>{rev.clientName}</p>}
                  {rev.vatAmount > 0 && <p className="text-[11px] mt-0.5" style={{ color: '#888780' }}>TVA {eur(rev.vatAmount)} · TTC {eur(rev.amount + rev.vatAmount)}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-[16px] font-bold tabular-nums" style={{ color: '#185FA5' }}>{eur(rev.amount)}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setSlider({ mode: 'edit', revenue: rev })}
                      className="rounded-lg p-1.5 active:bg-zinc-100" style={{ color: '#888780' }}>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button onClick={() => handleDelete(rev.id)} disabled={deleting === rev.id}
                      className="rounded-lg p-1.5 active:bg-red-50 disabled:opacity-40" style={{ color: '#DC2626' }}>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block rounded-xl border border-[#E5E4E0] bg-white overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-zinc-400">Chargement…</div>
          ) : revenues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <svg className="h-10 w-10 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-zinc-400">Aucun revenu sur cette période</p>
              <button onClick={() => setSlider({ mode: 'create' })}
                className="text-sm font-medium text-[#378ADD] hover:underline">
                Ajouter un revenu
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="py-3 pl-5 pr-3 text-left font-medium text-zinc-500">Date</th>
                  <th className="px-3 py-3 text-left font-medium text-zinc-500">Description / Client</th>
                  <th className="px-3 py-3 text-left font-medium text-zinc-500">Catégorie</th>
                  <th className="px-3 py-3 text-right font-medium text-zinc-500">Montant HT</th>
                  <th className="px-3 py-3 text-right font-medium text-zinc-500">TVA</th>
                  <th className="px-3 py-3 text-right font-medium text-zinc-500">TTC</th>
                  <th className="py-3 pl-3 pr-5 text-right font-medium text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {revenues.map((rev) => (
                  <tr key={rev.id} className="group hover:bg-zinc-50 transition">
                    <td className="py-3 pl-5 pr-3 text-zinc-500 tabular-nums">{fmtDate(rev.date)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium text-zinc-800">
                            {rev.description || <span className="text-zinc-400 italic">—</span>}
                          </p>
                          {rev.clientName && <p className="text-xs text-zinc-400">{rev.clientName}</p>}
                        </div>
                        {rev.isRecurring && (
                          <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                            {rev.recurrenceInterval ? RECURRENCE_LABELS[rev.recurrenceInterval] : 'Récurrent'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {rev.userCategory ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-700">
                          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: rev.userCategory.color }} />
                          {rev.userCategory.name}
                        </span>
                      ) : (
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${CAT[rev.category].color}`}>
                          {CAT[rev.category].label}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-zinc-900 tabular-nums">{eur(rev.amount)}</td>
                    <td className="px-3 py-3 text-right text-zinc-500 tabular-nums">
                      {rev.vatAmount > 0 ? eur(rev.vatAmount) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right text-zinc-700 tabular-nums">{eur(rev.amount + rev.vatAmount)}</td>
                    <td className="py-3 pl-3 pr-5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => setSlider({ mode: 'edit', revenue: rev })}
                          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition" title="Modifier">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(rev.id)} disabled={deleting === rev.id}
                          className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-40" title="Supprimer">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

        {/* Category breakdown */}
        {(stats?.byCategory ?? []).length > 0 && (
          <div className="rounded-xl border border-[#E5E4E0] bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-zinc-700">Répartition par catégorie</h2>
            <div className="space-y-2">
              {stats!.byCategory.map(({ category, amount: amt }) => {
                const pct = total > 0 ? (amt / total) * 100 : 0;
                return (
                  <div key={category} className="flex items-center gap-3">
                    <span className={`w-28 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${CAT[category].color}`}>
                      {CAT[category].label}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-zinc-100">
                      <div className="h-2 rounded-full bg-[#378ADD] transition-all" style={{ width: `${pct.toFixed(1)}%` }} />
                    </div>
                    <span className="w-20 shrink-0 text-right text-sm font-semibold text-zinc-700 tabular-nums">{eur(amt)}</span>
                    <span className="w-10 shrink-0 text-right text-xs text-zinc-400 tabular-nums">{pct.toFixed(0)} %</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {slider && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setSlider(null)} />
      )}

      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-white shadow-2xl transform transition-transform duration-200 ease-out ${slider ? 'translate-x-0' : 'translate-x-full'}`}>
        {slider && (
          <RevenueForm
            initial={slider.mode === 'edit' ? slider.revenue : undefined}
            onSave={handleSave}
            onClose={() => setSlider(null)}
            userCategories={userCategories}
          />
        )}
      </div>
    </div>
  );
}
