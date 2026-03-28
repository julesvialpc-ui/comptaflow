'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TaxReport, TaxReportStatus, TaxReportType, TaxPreview } from '@/lib/types';
import {
  apiGetTaxReports, apiGetUpcoming, apiPreview,
  apiCreateTaxReport, apiUpdateTaxReport, apiUpdateTaxStatus, apiDeleteTaxReport,
  getExpenseReportPdfUrl, TaxReportPayload,
} from '@/lib/tax-reports';
import { eur } from '@/lib/format';

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<TaxReportType, { label: string; color: string; autoCalc: boolean }> = {
  TVA:    { label: 'Décl. TVA',    color: 'bg-indigo-100 text-[#185FA5]',  autoCalc: true  },
  URSSAF: { label: 'URSSAF',       color: 'bg-violet-100 text-violet-700',  autoCalc: true  },
  IR:     { label: 'Impôt / Rev.', color: 'bg-amber-100 text-amber-700',    autoCalc: true  },
  IS:     { label: 'IS',           color: 'bg-orange-100 text-orange-700',  autoCalc: false },
  CFE:    { label: 'CFE',          color: 'bg-teal-100 text-teal-700',      autoCalc: false },
  OTHER:  { label: 'Autre',        color: 'bg-zinc-100 text-zinc-600',      autoCalc: false },
};

const STATUS_CONFIG: Record<TaxReportStatus, { label: string; color: string }> = {
  DRAFT:     { label: 'Brouillon', color: 'bg-zinc-100 text-zinc-600'      },
  SUBMITTED: { label: 'Soumis',    color: 'bg-blue-100 text-blue-700'      },
  VALIDATED: { label: 'Validé',    color: 'bg-emerald-100 text-emerald-700' },
};

const DETAIL_LABELS: Record<string, string> = {
  invoiceCount:          'Factures payées',
  invoiceTotalHT:        'CA HT',
  invoiceTotalTTC:       'CA TTC',
  invoiceVATCollected:   'TVA collectée',
  expenseCount:          'Dépenses déductibles',
  expenseVATDeductible:  'TVA déductible',
  netVATDue:             'TVA nette à payer',
  revenueHT:             'CA HT',
  cotisationRate:        'Taux (%)',
  cotisationDue:         'Cotisation due',
  abattementForFaitaire: 'Abattement forfaitaire',
  baseImposable:         'Base imposable',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tok() {
  return typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtPeriod(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })} → ${e.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`;
}

function daysUntil(d: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function urgencyClass(days: number | null) {
  if (days === null) return 'border-zinc-200 bg-zinc-50';
  if (days < 0)  return 'border-red-300 bg-red-50';
  if (days <= 7) return 'border-red-200 bg-red-50';
  if (days <= 30) return 'border-amber-200 bg-amber-50';
  return 'border-blue-200 bg-blue-50';
}

function urgencyTextClass(days: number | null) {
  if (days === null) return 'text-zinc-500';
  if (days < 0)  return 'text-red-700';
  if (days <= 7) return 'text-red-600';
  if (days <= 30) return 'text-amber-600';
  return 'text-blue-600';
}

// ─── Slide-over form ──────────────────────────────────────────────────────────

type SliderState = { mode: 'create' } | { mode: 'edit'; report: TaxReport };

interface ReportFormProps {
  initial?: TaxReport;
  onSave: (payload: TaxReportPayload) => Promise<void>;
  onClose: () => void;
}

function ReportForm({ initial, onSave, onClose }: ReportFormProps) {
  const [type, setType]               = useState<TaxReportType>(initial?.type ?? 'TVA');
  const [periodStart, setPeriodStart] = useState(initial?.periodStart.slice(0, 10) ?? firstDayOfMonth());
  const [periodEnd, setPeriodEnd]     = useState(initial?.periodEnd.slice(0, 10)   ?? lastDayOfMonth());
  const [dueDate, setDueDate]         = useState(initial?.dueDate?.slice(0, 10)    ?? '');
  const [amount, setAmount]           = useState(initial ? String(initial.amount) : '');
  const [notes, setNotes]             = useState(initial?.notes ?? '');
  const [preview, setPreview]         = useState<TaxPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  async function handleAutoCalc() {
    setError('');
    setPreviewLoading(true);
    try {
      const p = await apiPreview(tok(), type, periodStart, periodEnd);
      setPreview(p);
      setAmount(p.amount.toFixed(2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de calcul.');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSave({
        type,
        periodStart,
        periodEnd,
        dueDate:  dueDate || undefined,
        amount:   parseFloat(amount) || 0,
        details:  preview?.details,
        notes:    notes.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#378ADD] focus:outline-none focus:ring-2 focus:ring-[#E6F1FB]';
  const canAutoCalc = TYPE_CONFIG[type].autoCalc && periodStart && periodEnd;

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <h2 className="text-base font-semibold text-zinc-900">
          {initial ? 'Modifier la déclaration' : 'Nouvelle déclaration'}
        </h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 transition">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {/* Type */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-500">Type de déclaration</label>
          <select value={type} onChange={(e) => { setType(e.target.value as TaxReportType); setPreview(null); }}
            className={inputCls}>
            {(Object.keys(TYPE_CONFIG) as TaxReportType[]).map((t) => (
              <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
            ))}
          </select>
        </div>

        {/* Period */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500">Début de période</label>
            <input type="date" value={periodStart}
              onChange={(e) => { setPeriodStart(e.target.value); setPreview(null); }}
              className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500">Fin de période</label>
            <input type="date" value={periodEnd}
              onChange={(e) => { setPeriodEnd(e.target.value); setPreview(null); }}
              className={inputCls} />
          </div>
        </div>

        {/* Due date */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-500">Date limite de dépôt</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
        </div>

        {/* Auto-calc */}
        {canAutoCalc && (
          <button type="button" onClick={handleAutoCalc} disabled={previewLoading}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#E6F1FB] bg-[#E6F1FB] px-4 py-2.5 text-sm font-medium text-[#185FA5] hover:bg-indigo-100 transition disabled:opacity-60">
            <svg className={`h-4 w-4 ${previewLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {previewLoading ? 'Calcul en cours…' : 'Calculer automatiquement'}
          </button>
        )}

        {/* Preview breakdown */}
        {preview && Object.keys(preview.details).length > 0 && (
          <div className="rounded-lg bg-[#E6F1FB] border border-indigo-100 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-[#185FA5] mb-2">Détail du calcul</p>
            {Object.entries(preview.details).map(([key, val]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-[#378ADD]">{DETAIL_LABELS[key] ?? key}</span>
                <span className="font-semibold text-indigo-800 tabular-nums">
                  {key === 'cotisationRate' ? `${val} %` : typeof val === 'number' && val > 100 ? eur(val) : val}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Amount */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-500">Montant (€)</label>
          <input type="number" min="0" step="0.01" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00" className={inputCls} />
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-500">Notes</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Références, observations…"
            className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#378ADD] focus:outline-none focus:ring-2 focus:ring-[#E6F1FB]" />
        </div>
      </div>

      <div className="border-t border-zinc-100 px-5 py-4 flex gap-3">
        <button type="submit" disabled={loading}
          className="flex-1 rounded-lg bg-[#378ADD] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition disabled:opacity-60">
          {loading ? 'Enregistrement…' : initial ? 'Mettre à jour' : 'Créer la déclaration'}
        </button>
        <button type="button" onClick={onClose}
          className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition">
          Annuler
        </button>
      </div>
    </form>
  );
}

// ─── Note de frais tab ────────────────────────────────────────────────────────

function ExpenseReportTab() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo]     = useState(lastDayOfMonth());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    const t = tok();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getExpenseReportPdfUrl(from, to), { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) {
        const msg = await res.text().catch(() => `Erreur ${res.status}`);
        throw new Error(msg || `Erreur ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `note-de-frais-${from.slice(0, 7)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la génération');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="rounded-xl border border-[#E5E4E0] bg-white p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Générer une note de frais</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Exporte toutes vos dépenses sur une période en PDF — idéal pour votre comptable ou votre déclaration fiscale.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500">Du</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#378ADD] focus:outline-none focus:ring-2 focus:ring-[#E6F1FB]" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500">Au</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#378ADD] focus:outline-none focus:ring-2 focus:ring-[#E6F1FB]" />
          </div>
        </div>

        <button onClick={handleDownload} disabled={loading || !from || !to}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#378ADD] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition disabled:opacity-60">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {loading ? 'Génération…' : 'Télécharger le PDF'}
        </button>
        {error && (
          <p className="text-sm text-red-600 rounded-lg bg-red-50 px-3 py-2">{error}</p>
        )}
      </div>

      {/* Shortcuts */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Raccourcis</p>
        {[
          { label: 'Mois en cours',      from: firstDayOfMonth(),   to: lastDayOfMonth()   },
          { label: 'Mois précédent',     from: firstDayOfMonth(-1), to: lastDayOfMonth(-1) },
          { label: 'Trimestre en cours', from: firstDayOfQuarter(), to: lastDayOfQuarter() },
          { label: 'Année en cours',     from: firstDayOfYear(),    to: lastDayOfYear()    },
        ].map((s) => (
          <button key={s.label}
            onClick={() => { setFrom(s.from); setTo(s.to); }}
            className="w-full flex items-center justify-between rounded-lg border border-[#E5E4E0] bg-white px-4 py-3 text-sm hover:bg-zinc-50 transition">
            <span className="font-medium text-zinc-700">{s.label}</span>
            <span className="text-zinc-400 text-xs">{fmtDate(s.from)} → {fmtDate(s.to)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function firstDayOfMonth(offset = 0) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset, 1).toISOString().slice(0, 10);
}
function lastDayOfMonth(offset = 0) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset + 1, 0).toISOString().slice(0, 10);
}
function firstDayOfQuarter() {
  const m = new Date().getMonth();
  const qStart = Math.floor(m / 3) * 3;
  return new Date(new Date().getFullYear(), qStart, 1).toISOString().slice(0, 10);
}
function lastDayOfQuarter() {
  const m = new Date().getMonth();
  const qEnd = Math.floor(m / 3) * 3 + 3;
  return new Date(new Date().getFullYear(), qEnd, 0).toISOString().slice(0, 10);
}
function firstDayOfYear() {
  return new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
}
function lastDayOfYear() {
  return new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0, 10);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TaxReportsPage() {
  const router = useRouter();
  const [reports, setReports]   = useState<TaxReport[]>([]);
  const [upcoming, setUpcoming] = useState<TaxReport[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<'declarations' | 'expense-reports'>('declarations');
  const [statusFilter, setStatusFilter] = useState<TaxReportStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter]     = useState<TaxReportType  | 'ALL'>('ALL');
  const [slider, setSlider]     = useState<SliderState | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(() => {
    const t = tok();
    if (!t) { router.push('/login'); return; }
    setLoading(true);
    Promise.all([
      apiGetTaxReports(t, {
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        type:   typeFilter   !== 'ALL' ? typeFilter   : undefined,
      }),
      apiGetUpcoming(t),
    ])
      .then(([r, u]) => { setReports(r); setUpcoming(u); })
      .finally(() => setLoading(false));
  }, [statusFilter, typeFilter, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSlider(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  async function handleSave(payload: TaxReportPayload) {
    const t = tok();
    if (slider?.mode === 'edit') {
      const updated = await apiUpdateTaxReport(t, slider.report.id, payload);
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } else {
      const created = await apiCreateTaxReport(t, payload);
      setReports((prev) => [created, ...prev]);
    }
    setSlider(null);
    apiGetUpcoming(tok()).then(setUpcoming);
  }

  async function handleStatus(id: string, status: TaxReportStatus) {
    setActingId(id);
    try {
      const updated = await apiUpdateTaxStatus(tok(), id, status);
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      apiGetUpcoming(tok()).then(setUpcoming);
    } finally {
      setActingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette déclaration ?')) return;
    setActingId(id);
    try {
      await apiDeleteTaxReport(tok(), id);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <header className="border-b border-[#E5E4E0] bg-white px-4 py-4 -mx-4 sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Fiscalité</h1>
            <p className="text-sm text-zinc-500">Déclarations fiscales &amp; notes de frais</p>
          </div>
          {tab === 'declarations' && (
            <button onClick={() => setSlider({ mode: 'create' })}
              className="flex items-center gap-2 rounded-lg bg-[#378ADD] px-4 py-2 text-sm font-semibold text-white hover:opacity-80 transition">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Nouvelle déclaration</span>
              <span className="sm:hidden">Nouveau</span>
            </button>
          )}
        </div>
      </header>

      <main className="space-y-4 sm:space-y-6">
        {/* Tabs — select on mobile, pills on desktop */}
        <select
          className="sm:hidden w-full rounded-lg border px-3 py-2.5 text-[14px] font-medium appearance-none"
          style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
          value={tab}
          onChange={(e) => setTab(e.target.value as 'declarations' | 'expense-reports')}
        >
          <option value="declarations">Déclarations fiscales</option>
          <option value="expense-reports">Notes de frais</option>
        </select>
        <div className="hidden sm:flex gap-1 rounded-xl bg-zinc-100 p-1 w-fit">
          {([
            { id: 'declarations',    label: 'Déclarations fiscales' },
            { id: 'expense-reports', label: 'Notes de frais' },
          ] as const).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                tab === t.id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'expense-reports' ? (
          <ExpenseReportTab />
        ) : (
          <>
            {/* Upcoming deadlines */}
            {upcoming.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-semibold text-zinc-600">Échéances à venir</h2>
                <div className="flex flex-wrap gap-3">
                  {upcoming.map((r) => {
                    const days = daysUntil(r.dueDate);
                    return (
                      <div key={r.id}
                        className={`rounded-xl border px-4 py-3 min-w-[220px] ${urgencyClass(days)}`}>
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_CONFIG[r.type].color}`}>
                              {TYPE_CONFIG[r.type].label}
                            </span>
                            <p className="text-xs text-zinc-500 mt-1">{fmtPeriod(r.periodStart, r.periodEnd)}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${urgencyTextClass(days)}`}>
                              {days === null ? '—' : days < 0 ? `${-days}j dépassé` : days === 0 ? "Aujourd'hui" : `J-${days}`}
                            </p>
                            <p className="text-xs text-zinc-500">{fmtDate(r.dueDate)}</p>
                          </div>
                        </div>
                        {r.amount > 0 && (
                          <p className="mt-2 text-sm font-semibold text-zinc-900">{eur(r.amount)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status filter — select on mobile */}
              <select
                className="sm:hidden rounded-lg border px-3 py-2 text-sm appearance-none"
                style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TaxReportStatus | 'ALL')}
              >
                <option value="ALL">Tous</option>
                {(['DRAFT', 'SUBMITTED', 'VALIDATED'] as const).map(s => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
              <div className="hidden sm:flex gap-1 rounded-xl bg-zinc-100 p-1">
                {(['ALL', 'DRAFT', 'SUBMITTED', 'VALIDATED'] as const).map((s) => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      statusFilter === s ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                    }`}>
                    {s === 'ALL' ? 'Tous' : STATUS_CONFIG[s as TaxReportStatus].label}
                  </button>
                ))}
              </div>

              {/* Type filter */}
              <select value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TaxReportType | 'ALL')}
                className="rounded-lg border border-[#E5E4E0] bg-white px-3 py-2 text-sm focus:border-[#378ADD] focus:outline-none focus:ring-2 focus:ring-[#E6F1FB]">
                <option value="ALL">Tous les types</option>
                {(Object.keys(TYPE_CONFIG) as TaxReportType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
                ))}
              </select>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-[#E5E4E0] bg-white overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-sm text-zinc-400">Chargement…</div>
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <svg className="h-10 w-10 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-zinc-400">Aucune déclaration</p>
                  <button onClick={() => setSlider({ mode: 'create' })}
                    className="text-sm font-medium text-[#378ADD] hover:underline">
                    Créer une déclaration
                  </button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50">
                      <th className="py-3 pl-5 pr-3 text-left font-medium text-zinc-500">Type</th>
                      <th className="px-3 py-3 text-left font-medium text-zinc-500">Période</th>
                      <th className="px-3 py-3 text-left font-medium text-zinc-500">Échéance</th>
                      <th className="px-3 py-3 text-right font-medium text-zinc-500">Montant</th>
                      <th className="px-3 py-3 text-center font-medium text-zinc-500">Statut</th>
                      <th className="py-3 pl-3 pr-5 text-right font-medium text-zinc-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {reports.map((r) => {
                      const days = daysUntil(r.dueDate);
                      const dueCls = days !== null && days < 0 ? 'text-red-600 font-semibold'
                        : days !== null && days <= 7 ? 'text-red-500' : 'text-zinc-500';
                      return (
                        <tr key={r.id} className="group hover:bg-zinc-50 transition">
                          <td className="py-3 pl-5 pr-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_CONFIG[r.type].color}`}>
                              {TYPE_CONFIG[r.type].label}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-zinc-600 text-xs">{fmtPeriod(r.periodStart, r.periodEnd)}</td>
                          <td className={`px-3 py-3 text-xs ${dueCls}`}>
                            {fmtDate(r.dueDate)}
                            {days !== null && days >= 0 && days <= 30 && (
                              <span className="ml-1 text-zinc-400">(J-{days})</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-zinc-900 tabular-nums">
                            {r.amount > 0 ? eur(r.amount) : '—'}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CONFIG[r.status].color}`}>
                              {STATUS_CONFIG[r.status].label}
                            </span>
                          </td>
                          <td className="py-3 pl-3 pr-5">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                              {/* Status transitions */}
                              {r.status === 'DRAFT' && (
                                <button onClick={() => handleStatus(r.id, 'SUBMITTED')}
                                  disabled={actingId === r.id}
                                  className="rounded px-2 py-1 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition disabled:opacity-40"
                                  title="Marquer comme soumis">
                                  Soumettre
                                </button>
                              )}
                              {r.status === 'SUBMITTED' && (
                                <button onClick={() => handleStatus(r.id, 'VALIDATED')}
                                  disabled={actingId === r.id}
                                  className="rounded px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition disabled:opacity-40"
                                  title="Valider">
                                  Valider
                                </button>
                              )}
                              {/* Edit */}
                              <button onClick={() => setSlider({ mode: 'edit', report: r })}
                                className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
                                title="Modifier">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {/* Delete */}
                              <button onClick={() => handleDelete(r.id)}
                                disabled={actingId === r.id}
                                className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-40"
                                title="Supprimer">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </main>

      {/* Slide-over */}
      {slider && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setSlider(null)} />
      )}
      <div className={`fixed inset-y-0 right-0 z-50 w-[480px] bg-white shadow-2xl transform transition-transform duration-200 ease-out ${
        slider ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {slider && (
          <ReportForm
            initial={slider.mode === 'edit' ? slider.report : undefined}
            onSave={handleSave}
            onClose={() => setSlider(null)}
          />
        )}
      </div>
    </div>
  );
}
