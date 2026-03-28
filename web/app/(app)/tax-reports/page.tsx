'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TaxReport, TaxReportStatus, TaxReportType, TaxPreview, Expense, ExpenseCategory } from '@/lib/types';
import {
  apiGetTaxReports, apiGetUpcoming, apiPreview,
  apiCreateTaxReport, apiUpdateTaxReport, apiUpdateTaxStatus, apiDeleteTaxReport,
  getExpenseReportPdfUrl, TaxReportPayload,
} from '@/lib/tax-reports';
import { apiGetExpenses, apiCreateExpense, apiDeleteExpense, apiAnalyzeReceipt, ReceiptAnalysis } from '@/lib/expenses';
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

// ─── Category labels ─────────────────────────────────────────────────────────

const CAT_LABELS: Record<ExpenseCategory, string> = {
  OFFICE_SUPPLIES: 'Fournitures',
  TRAVEL: 'Transport',
  MEALS: 'Repas',
  EQUIPMENT: 'Équipement',
  SOFTWARE: 'Logiciel',
  MARKETING: 'Marketing',
  PROFESSIONAL_FEES: 'Honoraires',
  RENT: 'Loyer',
  UTILITIES: 'Charges',
  INSURANCE: 'Assurance',
  TAXES: 'Taxes',
  SALARY: 'Salaire',
  OTHER: 'Autre',
};

const CAT_COLORS: Record<ExpenseCategory, string> = {
  OFFICE_SUPPLIES: '#6366F1', TRAVEL: '#0EA5E9', MEALS: '#F97316',
  EQUIPMENT: '#8B5CF6', SOFTWARE: '#06B6D4', MARKETING: '#EC4899',
  PROFESSIONAL_FEES: '#185FA5', RENT: '#64748B', UTILITIES: '#84CC16',
  INSURANCE: '#F59E0B', TAXES: '#EF4444', SALARY: '#10B981', OTHER: '#9CA3AF',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ─── Note de frais tab ────────────────────────────────────────────────────────

function ExpenseReportTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Receipt list (expenses with receiptUrl)
  const [receipts, setReceipts] = useState<Expense[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Upload flow
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [pendingAnalysis, setPendingAnalysis] = useState<{ file: File; preview: string; analysis: ReceiptAnalysis } | null>(null);

  // Confirm form fields
  const [cfSupplier, setCfSupplier] = useState('');
  const [cfDate, setCfDate] = useState('');
  const [cfAmountTTC, setCfAmountTTC] = useState('');
  const [cfVat, setCfVat] = useState('');
  const [cfCategory, setCfCategory] = useState<ExpenseCategory>('OTHER');
  const [cfDescription, setCfDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // PDF export
  const [showExport, setShowExport] = useState(false);
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(lastDayOfMonth());
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Enlarged image
  const [enlarged, setEnlarged] = useState<string | null>(null);

  useEffect(() => {
    const t = tok();
    if (!t) return;
    setLoadingList(true);
    apiGetExpenses(t)
      .then((list) => setReceipts(list.filter((e) => e.receiptUrl)))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const preview = URL.createObjectURL(file);
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const analysis = await apiAnalyzeReceipt(tok(), file);
      setPendingAnalysis({ file, preview, analysis });
      setCfSupplier(analysis.supplier ?? '');
      setCfDate(analysis.date ?? new Date().toISOString().slice(0, 10));
      setCfAmountTTC(analysis.amountTTC != null ? String(analysis.amountTTC) : '');
      setCfVat(analysis.vatAmount != null ? String(analysis.vatAmount) : '');
      setCfCategory((analysis.category as ExpenseCategory) ?? 'OTHER');
      setCfDescription(analysis.description ?? '');
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Erreur d\'analyse');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleConfirm() {
    if (!pendingAnalysis) return;
    setSaving(true);
    try {
      const expense = await apiCreateExpense(tok(), {
        supplier: cfSupplier || undefined,
        date: cfDate,
        amount: parseFloat(cfAmountTTC) || 0,
        vatAmount: parseFloat(cfVat) || 0,
        category: cfCategory,
        description: cfDescription || undefined,
        receiptUrl: pendingAnalysis.analysis.receiptUrl,
        isDeductible: true,
      });
      setReceipts((prev) => [expense, ...prev]);
      setPendingAnalysis(null);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteReceipt(id: string) {
    if (!confirm('Supprimer ce justificatif ?')) return;
    await apiDeleteExpense(tok(), id);
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleDownloadPdf() {
    setPdfLoading(true);
    setPdfError(null);
    try {
      const res = await fetch(getExpenseReportPdfUrl(from, to), { headers: { Authorization: `Bearer ${tok()}` } });
      if (!res.ok) { const msg = await res.text().catch(() => `Erreur ${res.status}`); throw new Error(msg || `Erreur ${res.status}`); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `note-de-frais-${from.slice(0, 7)}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) { setPdfError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setPdfLoading(false); }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* ── Hidden file input ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Scan CTA ── */}
      {!pendingAnalysis && !analyzing && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-2xl border-2 border-dashed flex flex-col items-center gap-3 py-8 px-4 transition-all"
          style={{ borderColor: '#D0E6F7', background: '#F0F8FF' }}
        >
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: '#E0F0FF' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[15px] font-semibold" style={{ color: '#185FA5' }}>Photographier un justificatif</p>
            <p className="text-[13px] mt-0.5" style={{ color: '#378ADD' }}>Ticket, facture, reçu — l&apos;IA extrait tout automatiquement</p>
          </div>
        </button>
      )}

      {/* ── Analyzing loader ── */}
      {analyzing && (
        <div className="rounded-2xl border flex flex-col items-center gap-3 py-10" style={{ borderColor: '#E5E4E0', background: '#fff' }}>
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: '#E0F0FF' }}>
            <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="#378ADD">
              <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="3"/>
              <path className="opacity-75" fill="#378ADD" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
          <p className="text-[14px] font-medium" style={{ color: '#185FA5' }}>Analyse en cours…</p>
          <p className="text-[12px]" style={{ color: '#888780' }}>L&apos;IA lit votre justificatif</p>
        </div>
      )}

      {analyzeError && (
        <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          {analyzeError}
        </div>
      )}

      {/* ── Confirmation card ── */}
      {pendingAnalysis && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#E5E4E0', background: '#fff' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#F0EFEB', background: '#F8F8F6' }}>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: '#D0F0E8' }}>
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l2.5 2.5 5.5-5.5" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-[13px] font-semibold" style={{ color: '#059669' }}>Justificatif analysé</span>
            </div>
            <button onClick={() => { setPendingAnalysis(null); setAnalyzeError(null); }} className="text-zinc-400 hover:text-zinc-600 transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="flex gap-0 sm:gap-4 p-4 flex-col sm:flex-row">
            {/* Photo */}
            <div className="flex-shrink-0 mb-4 sm:mb-0">
              <button onClick={() => setEnlarged(pendingAnalysis.preview)} className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingAnalysis.preview}
                  alt="Justificatif"
                  className="rounded-xl object-cover"
                  style={{ width: '100%', maxWidth: 140, height: 180, objectFit: 'cover', border: '1px solid #E5E4E0' }}
                />
              </button>
              <p className="text-[10px] text-center mt-1" style={{ color: '#B0AFA9' }}>Appuyer pour agrandir</p>
            </div>

            {/* Fields */}
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: '#888780' }}>Fournisseur</label>
                  <input value={cfSupplier} onChange={(e) => setCfSupplier(e.target.value)}
                    placeholder="Nom du commerçant"
                    className="w-full rounded-lg px-2.5 py-2 text-[13px] outline-none"
                    style={{ border: '1px solid #E5E4E0', background: '#F8F8F6', color: '#1a1a18' }}/>
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: '#888780' }}>Date</label>
                  <input type="date" value={cfDate} onChange={(e) => setCfDate(e.target.value)}
                    className="w-full rounded-lg px-2.5 py-2 text-[13px] outline-none"
                    style={{ border: '1px solid #E5E4E0', background: '#F8F8F6', color: '#1a1a18' }}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: '#888780' }}>Montant TTC (€)</label>
                  <input type="number" step="0.01" value={cfAmountTTC} onChange={(e) => setCfAmountTTC(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg px-2.5 py-2 text-[13px] outline-none"
                    style={{ border: '1px solid #E5E4E0', background: '#F8F8F6', color: '#1a1a18' }}/>
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: '#888780' }}>TVA (€)</label>
                  <input type="number" step="0.01" value={cfVat} onChange={(e) => setCfVat(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg px-2.5 py-2 text-[13px] outline-none"
                    style={{ border: '1px solid #E5E4E0', background: '#F8F8F6', color: '#1a1a18' }}/>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: '#888780' }}>Catégorie</label>
                <select value={cfCategory} onChange={(e) => setCfCategory(e.target.value as ExpenseCategory)}
                  className="w-full rounded-lg px-2.5 py-2 text-[13px] outline-none appearance-none"
                  style={{ border: '1px solid #E5E4E0', background: '#F8F8F6', color: '#1a1a18' }}>
                  {(Object.keys(CAT_LABELS) as ExpenseCategory[]).map((c) => (
                    <option key={c} value={c}>{CAT_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: '#888780' }}>Description</label>
                <input value={cfDescription} onChange={(e) => setCfDescription(e.target.value)}
                  placeholder="Ex : Déjeuner client"
                  className="w-full rounded-lg px-2.5 py-2 text-[13px] outline-none"
                  style={{ border: '1px solid #E5E4E0', background: '#F8F8F6', color: '#1a1a18' }}/>
              </div>

              <button onClick={handleConfirm} disabled={saving}
                className="w-full rounded-xl py-2.5 text-[13px] font-semibold transition disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #185FA5 0%, #378ADD 100%)', color: '#fff' }}>
                {saving ? 'Enregistrement…' : 'Sauvegarder la dépense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Receipts list ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-semibold" style={{ color: '#1a1a18' }}>
            Mes justificatifs {!loadingList && receipts.length > 0 && <span className="font-normal" style={{ color: '#888780' }}>({receipts.length})</span>}
          </p>
          {!pendingAnalysis && !analyzing && (
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition"
              style={{ background: '#E6F1FB', color: '#185FA5' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 4v16m8-8H4"/></svg>
              Ajouter
            </button>
          )}
        </div>

        {loadingList ? (
          <div className="py-8 text-center text-sm" style={{ color: '#B0AFA9' }}>Chargement…</div>
        ) : receipts.length === 0 ? (
          <div className="rounded-xl py-10 flex flex-col items-center gap-2" style={{ background: '#F8F8F6' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D0CFC9" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            <p className="text-[13px]" style={{ color: '#B0AFA9' }}>Aucun justificatif pour l&apos;instant</p>
            <p className="text-[12px]" style={{ color: '#C8C7C1' }}>Photographiez votre premier ticket</p>
          </div>
        ) : (
          <div className="space-y-2">
            {receipts.map((r) => {
              const imgUrl = r.receiptUrl?.startsWith('/uploads')
                ? `${API_BASE}${r.receiptUrl}`
                : r.receiptUrl ?? '';
              const catColor = CAT_COLORS[r.category as ExpenseCategory] ?? '#9CA3AF';
              const catLabel = CAT_LABELS[r.category as ExpenseCategory] ?? r.category;
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#fff', border: '1px solid #F0EFEB' }}>
                  {/* Thumbnail */}
                  <button onClick={() => setEnlarged(imgUrl)} className="flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgUrl} alt="" className="rounded-lg object-cover" style={{ width: 52, height: 52, objectFit: 'cover' }} />
                  </button>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold truncate" style={{ color: '#1a1a18' }}>
                        {r.supplier || r.description || 'Justificatif'}
                      </span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white" style={{ background: catColor }}>
                        {catLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[12px]" style={{ color: '#888780' }}>
                        {new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-[12px] font-semibold" style={{ color: '#1a1a18' }}>
                        {eur(r.amount)}
                      </span>
                    </div>
                  </div>
                  {/* Delete */}
                  <button onClick={() => handleDeleteReceipt(r.id)}
                    className="flex-shrink-0 rounded-lg p-1.5 transition"
                    style={{ color: '#C8C7C1' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#C8C7C1')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6m5 0V4h4v2"/>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── PDF Export (collapsible) ── */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#E5E4E0' }}>
        <button onClick={() => setShowExport(!showExport)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition"
          style={{ background: '#F8F8F6', color: '#555450' }}>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <path d="M12 18v-6m-3 3l3 3 3-3"/>
            </svg>
            Exporter en PDF
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`transition-transform ${showExport ? 'rotate-180' : ''}`}>
            <path d="M6 9l6 6 6-6" strokeLinecap="round"/>
          </svg>
        </button>

        {showExport && (
          <div className="p-4 space-y-3" style={{ background: '#fff' }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: '#888780' }}>Du</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#378ADD] focus:outline-none"/>
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: '#888780' }}>Au</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#378ADD] focus:outline-none"/>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Ce mois', from: firstDayOfMonth(), to: lastDayOfMonth() },
                { label: 'Mois passé', from: firstDayOfMonth(-1), to: lastDayOfMonth(-1) },
                { label: 'Ce trimestre', from: firstDayOfQuarter(), to: lastDayOfQuarter() },
              ].map((s) => (
                <button key={s.label} onClick={() => { setFrom(s.from); setTo(s.to); }}
                  className="rounded-lg px-2.5 py-1 text-[12px] font-medium"
                  style={{ background: '#F0F8FF', color: '#185FA5' }}>
                  {s.label}
                </button>
              ))}
            </div>
            <button onClick={handleDownloadPdf} disabled={pdfLoading || !from || !to}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-60"
              style={{ background: '#378ADD', color: '#fff' }}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              {pdfLoading ? 'Génération…' : 'Télécharger le PDF'}
            </button>
            {pdfError && <p className="text-sm text-red-600 rounded-lg bg-red-50 px-3 py-2">{pdfError}</p>}
          </div>
        )}
      </div>

      {/* ── Image enlarger ── */}
      {enlarged && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setEnlarged(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enlarged} alt="" className="max-h-[85vh] max-w-full rounded-2xl object-contain" onClick={(e) => e.stopPropagation()}/>
        </div>
      )}
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
