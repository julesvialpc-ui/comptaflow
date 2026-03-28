'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Invoice, InvoiceStatus, RecurrenceInterval } from '@/lib/types';
import { apiGetInvoices, apiDeleteInvoice, apiCreateInvoice, apiNextInvoiceNumber, getPdfUrl } from '@/lib/invoices';
import { authFetch, getActivePlan } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { apiGetUsage, PlanUsage } from '@/lib/subscriptions';
import { eur } from '@/lib/format';
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/format';
import UpgradeModal from '@/components/UpgradeModal';
import { SkeletonList } from '@/components/Skeleton';
import { useToast } from '@/contexts/ToastContext';
import { MobileActionSheet } from '@/components/MobileActionSheet';

// ─── Tab config ──────────────────────────────────────────────────────────────

const TABS: { label: string; value: InvoiceStatus | 'ALL' }[] = [
  { label: 'Toutes',      value: 'ALL'       },
  { label: 'Brouillons',  value: 'DRAFT'     },
  { label: 'Envoyées',    value: 'SENT'      },
  { label: 'Payées',      value: 'PAID'      },
  { label: 'En retard',   value: 'OVERDUE'   },
  { label: 'Annulées',    value: 'CANCELLED' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

const RECURRENCE_LABELS: Record<RecurrenceInterval, string> = {
  WEEKLY: 'Hebdomadaire',
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  SEMI_ANNUAL: 'Semestriel',
};

function token() {
  return typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const plan = getActivePlan(user);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<InvoiceStatus | 'ALL'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('invoices-tab') as InvoiceStatus | 'ALL') ?? 'ALL';
    return 'ALL';
  });
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'number' | 'client' | 'issueDate' | 'dueDate' | 'total' | 'status'>('issueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [actionMenuInv, setActionMenuInv] = useState<Invoice | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ id: string; url: string } | null>(null);
  const [pdfBlob, setPdfBlob] = useState<string | null>(null);
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const t = token();
    if (!t) { router.push('/login'); return; }

    setLoading(true);
    const filters = tab !== 'ALL' ? { status: tab as InvoiceStatus } : {};
    apiGetInvoices(t, filters)
      .then(setInvoices)
      .finally(() => setLoading(false));
  }, [tab, router]);

  useEffect(() => {
    if (plan !== 'FREE') return;
    const t = token();
    if (!t) return;
    apiGetUsage(t).then(setUsage).catch(() => {});
  }, [plan]);

  const filtered = (search
    ? invoices.filter(
        (inv) =>
          inv.number.toLowerCase().includes(search.toLowerCase()) ||
          (inv.client?.name ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : invoices
  ).slice().sort((a, b) => {
    let av: string | number = '';
    let bv: string | number = '';
    if (sortField === 'number') { av = a.number; bv = b.number; }
    else if (sortField === 'client') { av = a.client?.name ?? ''; bv = b.client?.name ?? ''; }
    else if (sortField === 'issueDate') { av = a.issueDate ?? ''; bv = b.issueDate ?? ''; }
    else if (sortField === 'dueDate') { av = a.dueDate ?? ''; bv = b.dueDate ?? ''; }
    else if (sortField === 'total') { av = a.total; bv = b.total; }
    else if (sortField === 'status') { av = a.status; bv = b.status; }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  function SortIcon({ field }: { field: typeof sortField }) {
    if (sortField !== field) return <span className="ml-1 opacity-30">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette facture ? Cette action est irréversible.')) return;
    setDeleting(id);
    try {
      await apiDeleteInvoice(token(), id);
      setInvoices((prev) => prev.filter((i) => i.id !== id));
      toast('Facture supprimée.', 'success');
    } catch {
      toast('Erreur lors de la suppression.', 'error');
    } finally {
      setDeleting(null);
    }
  }

  async function handleGenerateNext(id: string) {
    if (!confirm('Générer la prochaine facture récurrente ?')) return;
    setGenerating(id);
    try {
      const res = await authFetch(`${API}/invoices/${id}/generate-next`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(await res.text());
      const newInv: Invoice = await res.json();
      setInvoices(prev => [newInv, ...prev]);
      toast('Prochaine facture récurrente générée.', 'success');
    } catch {
      toast('Erreur lors de la génération.', 'error');
    } finally {
      setGenerating(null);
    }
  }

  function handleDownloadPdf(id: string) {
    const t = token();
    fetch(getPdfUrl(id), { headers: { Authorization: `Bearer ${t}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `facture-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  async function handlePdfPreview(id: string) {
    const t = token();
    setPdfPreview({ id, url: '' });
    setPdfBlob(null);
    try {
      const res = await fetch(getPdfUrl(id), { headers: { Authorization: `Bearer ${t}` } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfBlob(url);
      setPdfPreview({ id, url });
    } catch {
      toast('Impossible de charger le PDF.', 'error');
      setPdfPreview(null);
    }
  }

  async function handleDuplicate(inv: Invoice) {
    setDuplicating(inv.id);
    try {
      const nextNum = await apiNextInvoiceNumber(token());
      const created = await apiCreateInvoice(token(), {
        number: nextNum,
        clientId: inv.clientId ?? undefined,
        status: 'DRAFT',
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: inv.dueDate ?? undefined,
        vatRate: inv.vatRate ?? undefined,
        notes: inv.notes ?? undefined,
        paymentTerms: inv.paymentTerms ?? undefined,
        items: inv.items.map(it => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          vatRate: it.vatRate,
        })),
      });
      setInvoices(prev => [created, ...prev]);
      toast('Facture dupliquée.', 'success');
    } catch {
      toast('Erreur lors de la duplication.', 'error');
    } finally {
      setDuplicating(null);
    }
  }

  const atInvoiceLimit = plan === 'FREE' && usage?.limits && usage.usage.invoicesThisMonth >= usage.limits.invoicesPerMonth;

  return (
    <div className="p-6 space-y-4">
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title="Limite de factures atteinte"
        description={`Vous avez créé ${usage?.usage.invoicesThisMonth ?? 5}/5 factures ce mois-ci. Passez au plan Pro pour des factures illimitées.`}
      />
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-medium" style={{ color: '#1a1a18' }}>Factures</h1>
          <p className="text-[12px] mt-0.5" style={{ color: '#888780' }}>
            {invoices.length} facture{invoices.length !== 1 ? 's' : ''}
            {plan === 'FREE' && usage?.limits && (
              <span
                className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ background: atInvoiceLimit ? '#FEE2E2' : '#F5F5F3', color: atInvoiceLimit ? '#DC2626' : '#888780' }}
              >
                {usage.usage.invoicesThisMonth}/{usage.limits.invoicesPerMonth} ce mois
              </span>
            )}
          </p>
        </div>
        {atInvoiceLimit ? (
          <button
            onClick={() => setShowUpgrade(true)}
            className="flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-medium"
            style={{ background: '#185FA5', color: '#FFFFFF' }}
          >
            ✦ Passer au Pro
          </button>
        ) : (
          <Link
            href="/invoices/new"
            className="flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-medium transition-opacity hover:opacity-80"
            style={{ background: '#378ADD', color: '#E6F1FB' }}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle facture
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
      <div className="flex gap-1 rounded-md p-0.5 w-fit" style={{ background: '#EDEDEB' }}>
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setTab(t.value); localStorage.setItem('invoices-tab', t.value); }}
            className="rounded px-3 py-1.5 text-[12px] font-medium transition-colors"
            style={tab === t.value
              ? { background: '#FFFFFF', color: '#1a1a18' }
              : { color: '#888780' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-64">
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

      {/* Mobile card list */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <SkeletonList rows={4} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl py-16 gap-4" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: '#F5F5F3' }}>
              <svg className="h-7 w-7" style={{ color: '#C8C6C2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-center px-6">
              <p className="text-[15px] font-medium" style={{ color: '#1a1a18' }}>{search ? 'Aucun résultat' : 'Aucune facture'}</p>
              <p className="text-[13px] mt-1" style={{ color: '#888780' }}>{search ? `Rien pour « ${search} »` : 'Créez votre première facture.'}</p>
            </div>
            {!search && (
              <Link href="/invoices/new" className="rounded-xl px-5 py-2.5 text-[14px] font-semibold text-white" style={{ background: '#185FA5' }}>
                Nouvelle facture
              </Link>
            )}
          </div>
        ) : (
          filtered.map((inv) => (
            <div key={inv.id} className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
              <Link href={`/invoices/${inv.id}`} className="flex items-start gap-3 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-[11px]" style={{ color: '#C8C6C2' }}>{inv.number}</span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[inv.status]}`}>{STATUS_LABEL[inv.status]}</span>
                  </div>
                  <p className="text-[16px] font-semibold truncate" style={{ color: '#1a1a18' }}>
                    {inv.client?.name ?? <span className="italic font-normal" style={{ color: '#888780' }}>Sans client</span>}
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: '#888780' }}>
                    {fmtDate(inv.issueDate)}{inv.dueDate ? ` · échéance ${fmtDate(inv.dueDate)}` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3 shrink-0">
                  <span className="text-[17px] font-bold" style={{ color: '#185FA5' }}>{eur(inv.total)}</span>
                  <button
                    onClick={(e) => { e.preventDefault(); setActionMenuInv(inv); }}
                    className="flex h-7 w-7 items-center justify-center rounded-full active:bg-zinc-100"
                    style={{ color: '#C8C6C2' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
                    </svg>
                  </button>
                </div>
              </Link>
            </div>
          ))
        )}
      </div>

      {/* Mobile action sheet */}
      <MobileActionSheet
        open={!!actionMenuInv}
        onClose={() => setActionMenuInv(null)}
        title={actionMenuInv?.number}
        actions={actionMenuInv ? [
          {
            label: 'Voir le détail',
            icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
            onClick: () => window.location.href = `/invoices/${actionMenuInv.id}`,
          },
          {
            label: 'Aperçu PDF',
            icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>,
            onClick: () => handlePdfPreview(actionMenuInv.id),
          },
          {
            label: 'Dupliquer',
            icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>,
            onClick: () => handleDuplicate(actionMenuInv),
            disabled: duplicating === actionMenuInv.id,
          },
          {
            label: 'Supprimer',
            icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
            onClick: () => handleDelete(actionMenuInv.id),
            variant: 'danger',
          },
        ] : []}
      />

      {/* Desktop table */}
      <div className="hidden sm:block rounded-lg overflow-hidden" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
        {loading ? (
          <div className="p-4"><SkeletonList rows={5} /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: '#F5F5F3' }}>
              <svg className="h-7 w-7" style={{ color: '#C8C6C2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[14px] font-medium mb-1" style={{ color: '#1a1a18' }}>
                {search ? `Aucune facture pour « ${search} »` : 'Aucune facture pour le moment'}
              </p>
              <p className="text-[13px]" style={{ color: '#888780' }}>
                {search ? 'Essayez un autre terme.' : 'Créez votre première facture en quelques secondes.'}
              </p>
            </div>
            {!search && (
              <Link href="/invoices/new"
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium text-white"
                style={{ background: '#185FA5' }}
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Créer une facture
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '0.5px solid #E5E4E0', background: '#F8F8F7' }}>
                <th className="py-3 pl-4 pr-3 text-left text-[11px] font-medium cursor-pointer select-none" style={{ color: '#888780' }} onClick={() => toggleSort('number')}>N° <SortIcon field="number" /></th>
                <th className="px-3 py-3 text-left text-[11px] font-medium cursor-pointer select-none" style={{ color: '#888780' }} onClick={() => toggleSort('client')}>Client <SortIcon field="client" /></th>
                <th className="px-3 py-3 text-left text-[11px] font-medium cursor-pointer select-none" style={{ color: '#888780' }} onClick={() => toggleSort('issueDate')}>Émise le <SortIcon field="issueDate" /></th>
                <th className="px-3 py-3 text-left text-[11px] font-medium cursor-pointer select-none" style={{ color: '#888780' }} onClick={() => toggleSort('dueDate')}>Échéance <SortIcon field="dueDate" /></th>
                <th className="px-3 py-3 text-right text-[11px] font-medium cursor-pointer select-none" style={{ color: '#888780' }} onClick={() => toggleSort('total')}>Montant <SortIcon field="total" /></th>
                <th className="px-3 py-3 text-center text-[11px] font-medium cursor-pointer select-none" style={{ color: '#888780' }} onClick={() => toggleSort('status')}>Statut <SortIcon field="status" /></th>
                <th className="py-3 pl-3 pr-4 text-right text-[11px] font-medium" style={{ color: '#888780' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => (
                <tr key={inv.id} className="group transition-colors" style={{ borderBottom: i < filtered.length - 1 ? '0.5px solid #F0F0EE' : undefined }}>
                  <td className="py-3 pl-4 pr-3 font-mono text-[12px] font-medium" style={{ color: '#888780' }}>
                    {inv.number}
                  </td>
                  <td className="px-3 py-3 text-[13px]" style={{ color: '#1a1a18' }}>
                    <div className="flex items-center gap-2">
                      {inv.client?.name ?? <span className="italic" style={{ color: '#888780' }}>Sans client</span>}
                      {inv.isRecurring && (
                        <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                          {inv.recurrenceInterval ? RECURRENCE_LABELS[inv.recurrenceInterval] : 'Récurrent'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[13px]" style={{ color: '#888780' }}>{fmtDate(inv.issueDate)}</td>
                  <td className="px-3 py-3 text-[13px]" style={{ color: '#888780' }}>{fmtDate(inv.dueDate)}</td>
                  <td className="px-3 py-3 text-right text-[13px] font-medium" style={{ color: '#1a1a18' }}>
                    {eur(inv.total)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[inv.status]}`}>
                      {STATUS_LABEL[inv.status]}
                    </span>
                  </td>
                  <td className="py-3 pl-3 pr-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                      <Link href={`/invoices/${inv.id}`} className="rounded p-1.5 transition-colors" style={{ color: '#888780' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5F5F3'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                        title="Voir"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                      <button onClick={() => handlePdfPreview(inv.id)} className="rounded p-1.5 transition-colors" style={{ color: '#888780' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5F5F3'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                        title="Aperçu PDF"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDownloadPdf(inv.id)} className="rounded p-1.5 transition-colors" style={{ color: '#888780' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5F5F3'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                        title="Télécharger PDF"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      <button onClick={() => handleDuplicate(inv)} disabled={duplicating === inv.id} className="rounded p-1.5 transition-colors disabled:opacity-40" style={{ color: '#888780' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5F5F3'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                        title="Dupliquer"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      {inv.isRecurring && (
                        <button onClick={() => handleGenerateNext(inv.id)} disabled={generating === inv.id}
                          className="rounded p-1.5 transition-colors disabled:opacity-40" style={{ color: '#378ADD' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E6F1FB'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                          title="Générer prochaine"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      )}
                      <button onClick={() => handleDelete(inv.id)} disabled={deleting === inv.id} className="rounded p-1.5 transition-colors disabled:opacity-40" style={{ color: '#888780' }}
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

      {/* PDF Preview Modal */}
      {pdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => { setPdfPreview(null); if (pdfBlob) URL.revokeObjectURL(pdfBlob); setPdfBlob(null); }}>
          <div className="relative flex flex-col rounded-xl overflow-hidden shadow-2xl bg-white" style={{ width: '760px', height: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
              <p className="text-[13px] font-medium" style={{ color: '#1a1a18' }}>Aperçu PDF</p>
              <div className="flex items-center gap-2">
                {pdfBlob && (
                  <button onClick={() => handleDownloadPdf(pdfPreview.id)}
                    className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium"
                    style={{ background: '#F5F5F3', color: '#1a1a18' }}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Télécharger
                  </button>
                )}
                <button onClick={() => { setPdfPreview(null); if (pdfBlob) URL.revokeObjectURL(pdfBlob); setPdfBlob(null); }} className="rounded-lg p-1.5 transition-colors hover:bg-zinc-100">
                  <svg className="h-4 w-4" style={{ color: '#888780' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-zinc-100 flex items-center justify-center">
              {!pdfBlob ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: '#378ADD', borderTopColor: 'transparent' }} />
                  <p className="text-[12px]" style={{ color: '#888780' }}>Chargement…</p>
                </div>
              ) : (
                <iframe src={pdfBlob} className="w-full h-full border-none" title="Aperçu PDF" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
