'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Expense, ExpenseCategory, ExpenseStats, RecurrenceInterval, UserCategory } from '@/lib/types';
import {
  apiGetExpenses,
  apiGetExpenseStats,
  apiCreateExpense,
  apiUpdateExpense,
  apiDeleteExpense,
  ExpensePayload,
} from '@/lib/expenses';
import { apiGetUserCategories } from '@/lib/user-categories';
import { eur } from '@/lib/format';

// ─── Category config ──────────────────────────────────────────────────────────

const CAT: Record<ExpenseCategory, { label: string; color: string }> = {
  OFFICE_SUPPLIES:   { label: 'Fournitures',   color: 'bg-blue-100 text-blue-700'      },
  TRAVEL:            { label: 'Déplacements',  color: 'bg-amber-100 text-amber-700'    },
  MEALS:             { label: 'Repas',         color: 'bg-orange-100 text-orange-700'  },
  EQUIPMENT:         { label: 'Matériel',      color: 'bg-violet-100 text-violet-700'  },
  SOFTWARE:          { label: 'Logiciels',     color: 'bg-indigo-100 text-[#185FA5]'  },
  MARKETING:         { label: 'Marketing',     color: 'bg-pink-100 text-pink-700'      },
  PROFESSIONAL_FEES: { label: 'Honoraires',    color: 'bg-teal-100 text-teal-700'      },
  RENT:              { label: 'Loyer',         color: 'bg-stone-100 text-stone-700'    },
  UTILITIES:         { label: 'Charges',       color: 'bg-yellow-100 text-yellow-700'  },
  INSURANCE:         { label: 'Assurance',     color: 'bg-green-100 text-green-700'    },
  TAXES:             { label: 'Impôts',        color: 'bg-red-100 text-red-700'        },
  SALARY:            { label: 'Salaires',      color: 'bg-emerald-100 text-emerald-700'},
  OTHER:             { label: 'Autre',         color: 'bg-zinc-100 text-zinc-600'      },
};

const CATEGORIES = Object.keys(CAT) as ExpenseCategory[];

const RECURRENCE_LABELS: Record<RecurrenceInterval, string> = {
  WEEKLY:      'Hebdomadaire',
  MONTHLY:     'Mensuel',
  QUARTERLY:   'Trimestriel',
  SEMI_ANNUAL: 'Semestriel',
};

// ─── Category VAT rates ───────────────────────────────────────────────────────

const CATEGORY_VAT_RATE: Record<ExpenseCategory, number> = {
  OFFICE_SUPPLIES: 0.20,
  TRAVEL: 0.10,
  MEALS: 0.10,
  EQUIPMENT: 0.20,
  SOFTWARE: 0.20,
  MARKETING: 0.20,
  PROFESSIONAL_FEES: 0.20,
  RENT: 0.20,
  UTILITIES: 0.20,
  INSURANCE: 0,
  TAXES: 0,
  SALARY: 0,
  OTHER: 0.20,
};

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
  const to   = new Date(y, m + 1, 0, 23, 59, 59);
  return { from: from.toISOString(), to: to.toISOString() };
}

function yearRange() {
  const y = new Date().getFullYear();
  return { from: new Date(y, 0, 1).toISOString(), to: new Date(y, 11, 31, 23, 59, 59).toISOString() };
}

// ─── Slide-over form ──────────────────────────────────────────────────────────

interface ExpenseFormProps {
  initial?: Expense;
  onSave: (payload: ExpensePayload) => Promise<void>;
  onClose: () => void;
  businessIsVatSubject: boolean;
  userCategories: UserCategory[];
}

function ExpenseForm({ initial, onSave, onClose, businessIsVatSubject, userCategories }: ExpenseFormProps) {
  // 'BUILTIN:CATEGORY_KEY' or 'CUSTOM:id'
  const getInitialSelection = () => {
    if (initial?.userCategoryId) return `CUSTOM:${initial.userCategoryId}`;
    return `BUILTIN:${initial?.category ?? 'OTHER'}`;
  };

  const [selection, setSelection]       = useState(getInitialSelection());
  const [ttcInput, setTtcInput]         = useState(
    initial ? String(Math.round((initial.amount + initial.vatAmount) * 100) / 100) : '',
  );
  const [description, setDescription]  = useState(initial?.description ?? '');
  const [supplier, setSupplier]         = useState(initial?.supplier ?? '');
  const [date, setDate]                 = useState(
    initial ? initial.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [isDeductible, setIsDeductible] = useState(initial?.isDeductible ?? true);
  const [isRecurring, setIsRecurring]   = useState(initial?.isRecurring ?? false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>(
    initial?.recurrenceInterval ?? 'MONTHLY',
  );
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const isCustom = selection.startsWith('CUSTOM:');
  const builtinCategory = isCustom ? 'OTHER' : (selection.replace('BUILTIN:', '') as ExpenseCategory);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const ttc = parseFloat(ttcInput);
    if (!ttc || ttc <= 0) { setError('Montant invalide.'); return; }
    const vatRate = businessIsVatSubject ? CATEGORY_VAT_RATE[builtinCategory] : 0;
    const ht = vatRate > 0 ? ttc / (1 + vatRate) : ttc;
    const tva = Math.round((ttc - ht) * 100) / 100;
    const htRounded = Math.round(ht * 100) / 100;

    setLoading(true);
    try {
      await onSave({
        category: builtinCategory,
        amount: htRounded,
        vatAmount: tva,
        description: description.trim() || undefined,
        supplier:    supplier.trim()    || undefined,
        date:        date               || undefined,
        isDeductible,
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
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <h2 className="text-base font-semibold text-zinc-900">
          {initial ? 'Modifier la dépense' : 'Nouvelle dépense'}
        </h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 transition">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {/* Category */}
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
              {CATEGORIES.map((c) => (
                <option key={c} value={`BUILTIN:${c}`}>{CAT[c].label}</option>
              ))}
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

        {/* TTC input */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-500">Montant TTC (€) <span className="text-red-500">*</span></label>
          <input type="number" min="0" step="0.01" value={ttcInput}
            onChange={(e) => setTtcInput(e.target.value)}
            placeholder="0.00" className={inputCls} />
        </div>

        {/* Calculated HT + TVA */}
        {parseFloat(ttcInput) > 0 && (
          <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2.5 space-y-1.5">
            {(() => {
              const ttc = parseFloat(ttcInput) || 0;
              const vatRate = businessIsVatSubject ? CATEGORY_VAT_RATE[builtinCategory] : 0;
              const ht = vatRate > 0 ? ttc / (1 + vatRate) : ttc;
              const tva = ttc - ht;
              return (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Taux TVA ({(vatRate * 100).toFixed(0)} %)</span>
                    <span className="font-medium text-zinc-700">{eur(tva)}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-zinc-100 pt-1.5">
                    <span className="text-zinc-500 font-medium">Montant HT calculé</span>
                    <span className="font-bold text-emerald-600">{eur(ht)}</span>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Date + supplier */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-500">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-500">Fournisseur</label>
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)}
            placeholder="Ex : Amazon, SNCF, Orange…" className={inputCls} />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-500">Description</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Détails de la dépense…"
            className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#378ADD] focus:outline-none focus:ring-2 focus:ring-[#E6F1FB]" />
        </div>

        {/* Deductible */}
        <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 hover:bg-zinc-100 transition">
          <input type="checkbox" checked={isDeductible} onChange={(e) => setIsDeductible(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-[#378ADD] focus:ring-[#E6F1FB]" />
          <div>
            <p className="text-sm font-medium text-zinc-700">Déductible fiscalement</p>
            <p className="text-xs text-zinc-400">Incluse dans vos charges déductibles</p>
          </div>
        </label>

        {/* Recurring */}
        <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 hover:bg-zinc-100 transition">
          <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-[#378ADD] focus:ring-[#E6F1FB]" />
          <div>
            <p className="text-sm font-medium text-zinc-700">Dépense récurrente</p>
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

      {/* Footer */}
      <div className="border-t border-zinc-100 px-5 py-4 flex gap-3">
        <button type="submit" disabled={loading}
          className="flex-1 rounded-lg bg-[#378ADD] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition disabled:opacity-60">
          {loading ? 'Enregistrement…' : initial ? 'Mettre à jour' : 'Ajouter la dépense'}
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

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVatSubject, setIsVatSubject] = useState(false);
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory | 'ALL'>('ALL');
  const [period, setPeriod] = useState<'month' | 'year' | 'all'>('month');

  // Slide-over
  const [slider, setSlider] = useState<{ mode: 'create' } | { mode: 'edit'; expense: Expense } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Fetch business VAT settings + user categories
  useEffect(() => {
    const t = tok();
    if (!t) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/businesses/me`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(biz => { if (biz) setIsVatSubject(biz.isVatSubject ?? false); })
      .catch(() => {});

    apiGetUserCategories(t, 'EXPENSE').then(setUserCategories).catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Compute date range from period
  const dateRange = period === 'month' ? monthRange() : period === 'year' ? yearRange() : {};

  const load = useCallback(() => {
    const t = tok();
    if (!t) { router.push('/login'); return; }
    setLoading(true);

    const filters = {
      category:  activeCategory !== 'ALL' ? activeCategory : undefined,
      search:    debouncedSearch || undefined,
      from:      (dateRange as { from?: string }).from,
      to:        (dateRange as { to?: string }).to,
    };

    Promise.all([
      apiGetExpenses(t, filters),
      apiGetExpenseStats(t, (dateRange as { from?: string }).from, (dateRange as { to?: string }).to),
    ])
      .then(([list, s]) => { setExpenses(list); setStats(s); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, debouncedSearch, period, router]);

  useEffect(() => { load(); }, [load]);

  // Close slider on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSlider(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  async function handleSave(payload: ExpensePayload) {
    const t = tok();
    if (slider?.mode === 'edit') {
      const updated = await apiUpdateExpense(t, slider.expense.id, payload);
      setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } else {
      const created = await apiCreateExpense(t, payload);
      setExpenses((prev) => [created, ...prev]);
    }
    setSlider(null);
    // Refresh stats
    apiGetExpenseStats(t, (dateRange as { from?: string }).from, (dateRange as { to?: string }).to)
      .then(setStats);
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette dépense ?')) return;
    setDeleting(id);
    try {
      await apiDeleteExpense(tok(), id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  const total    = stats?.total    ?? 0;
  const vatTotal = stats?.vatTotal ?? 0;
  const count    = stats?.count    ?? 0;
  const deductible = expenses.filter((e) => e.isDeductible).reduce((s, e) => s + e.amount, 0);

  const periodLabel = period === 'month' ? 'ce mois' : period === 'year' ? 'cette année' : 'toutes périodes';

  // Helper to display category label for an expense
  function getCatLabel(exp: Expense): string {
    if (exp.userCategory) return exp.userCategory.name;
    return CAT[exp.category]?.label ?? exp.category;
  }

  function getCatColor(exp: Expense): string {
    if (exp.userCategory) return exp.userCategory.color;
    return '';
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <header className="border-b border-[#E5E4E0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Dépenses</h1>
            <p className="text-sm text-zinc-500">{count} dépense{count !== 1 ? 's' : ''} · {periodLabel}</p>
          </div>
          <button
            onClick={() => setSlider({ mode: 'create' })}
            className="flex items-center gap-2 rounded-lg bg-[#378ADD] px-4 py-2 text-sm font-semibold text-white hover:opacity-80 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle dépense
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-5">
        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: `Total HT (${periodLabel})`,   value: eur(total),      sub: `dont ${eur(vatTotal)} de TVA`     },
            { label: 'Déductible HT',                value: eur(deductible), sub: `${Math.round(deductible / (total || 1) * 100)} % du total` },
            { label: 'Dépenses',                     value: String(count),   sub: 'transactions'                     },
            { label: 'Moy. par dépense',             value: count ? eur(total / count) : '—', sub: 'montant moyen HT' },
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
          {/* Period */}
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

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 0 5 11a6 6 0 0 0 12 0z" />
            </svg>
            <input type="text" placeholder="Description, fournisseur…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#E5E4E0] bg-white py-2 pl-9 pr-3 text-sm placeholder-zinc-400 focus:border-[#378ADD] focus:outline-none focus:ring-2 focus:ring-[#E6F1FB]" />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              activeCategory === 'ALL' ? 'bg-[#378ADD] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Toutes
          </button>
          {(stats?.byCategory ?? []).map(({ category, amount: amt }) => (
            <button
              key={category}
              onClick={() => setActiveCategory(activeCategory === category ? 'ALL' : category)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                activeCategory === category
                  ? 'bg-[#378ADD] text-white'
                  : `${CAT[category].color} hover:opacity-80`
              }`}
            >
              {CAT[category].label} · {eur(amt)}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-[#E5E4E0] bg-white overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-zinc-400">Chargement…</div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <svg className="h-10 w-10 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <p className="text-sm text-zinc-400">Aucune dépense sur cette période</p>
              <button onClick={() => setSlider({ mode: 'create' })}
                className="text-sm font-medium text-[#378ADD] hover:underline">
                Ajouter une dépense
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="py-3 pl-5 pr-3 text-left font-medium text-zinc-500">Date</th>
                  <th className="px-3 py-3 text-left font-medium text-zinc-500">Description / Fournisseur</th>
                  <th className="px-3 py-3 text-left font-medium text-zinc-500">Catégorie</th>
                  <th className="px-3 py-3 text-right font-medium text-zinc-500">Montant HT</th>
                  <th className="px-3 py-3 text-right font-medium text-zinc-500">TVA</th>
                  <th className="px-3 py-3 text-right font-medium text-zinc-500">TTC</th>
                  <th className="px-3 py-3 text-center font-medium text-zinc-500">Déductible</th>
                  <th className="py-3 pl-3 pr-5 text-right font-medium text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="group hover:bg-zinc-50 transition">
                    <td className="py-3 pl-5 pr-3 text-zinc-500 tabular-nums">{fmtDate(exp.date)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium text-zinc-800">
                            {exp.description || <span className="text-zinc-400 italic">—</span>}
                          </p>
                          {exp.supplier && <p className="text-xs text-zinc-400">{exp.supplier}</p>}
                        </div>
                        {exp.isRecurring && (
                          <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                            {exp.recurrenceInterval ? RECURRENCE_LABELS[exp.recurrenceInterval] : 'Récurrent'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {exp.userCategory ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-700">
                          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: getCatColor(exp) }} />
                          {getCatLabel(exp)}
                        </span>
                      ) : (
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${CAT[exp.category].color}`}>
                          {CAT[exp.category].label}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-zinc-900 tabular-nums">
                      {eur(exp.amount)}
                    </td>
                    <td className="px-3 py-3 text-right text-zinc-500 tabular-nums">
                      {exp.vatAmount > 0 ? eur(exp.vatAmount) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right text-zinc-700 tabular-nums">
                      {eur(exp.amount + exp.vatAmount)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {exp.isDeductible ? (
                        <svg className="mx-auto h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="mx-auto h-4 w-4 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </td>
                    <td className="py-3 pl-3 pr-5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => setSlider({ mode: 'edit', expense: exp })}
                          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
                          title="Modifier"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          disabled={deleting === exp.id}
                          className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-40"
                          title="Supprimer"
                        >
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
                      <div
                        className="h-2 rounded-full bg-[#E6F1FB]0 transition-all"
                        style={{ width: `${pct.toFixed(1)}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right text-sm font-semibold text-zinc-700 tabular-nums">
                      {eur(amt)}
                    </span>
                    <span className="w-10 shrink-0 text-right text-xs text-zinc-400 tabular-nums">
                      {pct.toFixed(0)} %
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Slide-over overlay */}
      {slider && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setSlider(null)}
        />
      )}

      {/* Slide-over panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-[460px] bg-white shadow-2xl transform transition-transform duration-200 ease-out ${
          slider ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {slider && (
          <ExpenseForm
            initial={slider.mode === 'edit' ? slider.expense : undefined}
            onSave={handleSave}
            onClose={() => setSlider(null)}
            businessIsVatSubject={isVatSubject}
            userCategories={userCategories}
          />
        )}
      </div>
    </div>
  );
}
