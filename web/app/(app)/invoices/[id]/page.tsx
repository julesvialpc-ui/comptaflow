'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Invoice, InvoiceStatus } from '@/lib/types';
import { apiGetInvoice, apiUpdateStatus, apiDeleteInvoice, getPdfUrl } from '@/lib/invoices';
import { eur } from '@/lib/format';
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/format';

// ─── Status workflow ──────────────────────────────────────────────────────────

interface StatusAction {
  status: InvoiceStatus;
  label: string;
  className: string;
}

const STATUS_ACTIONS: Record<InvoiceStatus, StatusAction[]> = {
  DRAFT:     [{ status: 'SENT',      label: 'Marquer comme envoyée',  className: 'bg-blue-600 text-white hover:bg-blue-700' }],
  SENT:      [
    { status: 'PAID',      label: 'Marquer comme payée',    className: 'bg-emerald-600 text-white hover:bg-emerald-700' },
    { status: 'OVERDUE',   label: 'Marquer en retard',      className: 'bg-red-600 text-white hover:bg-red-700' },
  ],
  OVERDUE:   [{ status: 'PAID',      label: 'Marquer comme payée',    className: 'bg-emerald-600 text-white hover:bg-emerald-700' }],
  PAID:      [],
  CANCELLED: [],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function token() {
  return typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    const t = token();
    if (!t) { router.push('/login'); return; }
    apiGetInvoice(t, id)
      .then(setInvoice)
      .catch(() => router.push('/invoices'))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleStatus(status: InvoiceStatus) {
    if (!invoice) return;
    setStatusLoading(true);
    try {
      const updated = await apiUpdateStatus(token(), invoice.id, status);
      setInvoice((prev) => prev ? { ...prev, status: updated.status, paidAt: updated.paidAt } : prev);
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer cette facture ? Cette action est irréversible.')) return;
    await apiDeleteInvoice(token(), id);
    router.push('/invoices');
  }

  function handleDownloadPdf() {
    const t = token();
    fetch(getPdfUrl(id), { headers: { Authorization: `Bearer ${t}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `facture-${invoice?.number ?? id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-400">
        Chargement…
      </div>
    );
  }

  if (!invoice) return null;

  const actions = STATUS_ACTIONS[invoice.status] ?? [];

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/invoices" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-zinc-900 font-mono">{invoice.number}</h1>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[invoice.status]}`}>
                  {STATUS_LABEL[invoice.status]}
                </span>
              </div>
              <p className="text-sm text-zinc-500">
                {invoice.client?.name ?? 'Sans client'} · Émise le {fmtDate(invoice.issueDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Status actions */}
            {actions.map((action) => (
              <button
                key={action.status}
                onClick={() => handleStatus(action.status)}
                disabled={statusLoading}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${action.className}`}
              >
                {action.label}
              </button>
            ))}
            {/* PDF */}
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              PDF
            </button>
            {/* Edit (DRAFT only) */}
            {invoice.status === 'DRAFT' && (
              <Link
                href={`/invoices/${invoice.id}/edit`}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Modifier
              </Link>
            )}
            {/* Delete */}
            <button
              onClick={handleDelete}
              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
            >
              Supprimer
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6 grid grid-cols-3 gap-6">
        {/* Left — invoice preview */}
        <div className="col-span-2">
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            {/* Invoice header */}
            <div className="bg-indigo-600 px-8 py-6 flex justify-between items-start">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-indigo-200">Facture</p>
                <p className="mt-1 text-2xl font-bold text-white font-mono">{invoice.number}</p>
              </div>
              <div className="text-right text-sm text-indigo-100 space-y-0.5">
                <p>Émise le {fmtDate(invoice.issueDate)}</p>
                {invoice.dueDate && <p>Échéance {fmtDate(invoice.dueDate)}</p>}
                {invoice.paidAt && <p className="text-emerald-200 font-medium">Payée le {fmtDate(invoice.paidAt)}</p>}
              </div>
            </div>

            <div className="px-8 py-6 space-y-6">
              {/* Client info */}
              {invoice.client && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 mb-2">Facturer à</p>
                  <div className="text-sm space-y-0.5">
                    <p className="font-semibold text-zinc-900">{invoice.client.name}</p>
                    {invoice.client.address && <p className="text-zinc-500">{invoice.client.address}</p>}
                    {(invoice.client.postalCode || invoice.client.city) && (
                      <p className="text-zinc-500">{[invoice.client.postalCode, invoice.client.city].filter(Boolean).join(' ')}</p>
                    )}
                    {invoice.client.email && <p className="text-zinc-500">{invoice.client.email}</p>}
                    {invoice.client.siret && <p className="text-zinc-400 text-xs">SIRET {invoice.client.siret}</p>}
                  </div>
                </div>
              )}

              {/* Items table */}
              <div className="overflow-hidden rounded-lg border border-zinc-100">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="py-2.5 pl-4 pr-3 text-left text-xs font-medium text-zinc-500">Description</th>
                      <th className="px-3 py-2.5 text-center text-xs font-medium text-zinc-500">Qté</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-zinc-500">Prix unit. HT</th>
                      <th className="px-3 py-2.5 text-center text-xs font-medium text-zinc-500">TVA</th>
                      <th className="py-2.5 pl-3 pr-4 text-right text-xs font-medium text-zinc-500">Total HT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {invoice.items.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-50/50">
                        <td className="py-2.5 pl-4 pr-3 text-zinc-800">{item.description}</td>
                        <td className="px-3 py-2.5 text-center text-zinc-500 tabular-nums">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-right text-zinc-600 tabular-nums">{eur(item.unitPrice)}</td>
                        <td className="px-3 py-2.5 text-center text-zinc-400">{item.vatRate} %</td>
                        <td className="py-2.5 pl-3 pr-4 text-right font-medium text-zinc-800 tabular-nums">
                          {eur(item.quantity * item.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-sm">
                  <div className="flex justify-between text-zinc-500">
                    <span>Sous-total HT</span>
                    <span className="tabular-nums">{eur(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>TVA ({invoice.vatRate} %)</span>
                    <span className="tabular-nums">{eur(invoice.vatAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200 pt-2 font-bold text-zinc-900">
                    <span>Total TTC</span>
                    <span className="tabular-nums">{eur(invoice.total)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {(invoice.paymentTerms || invoice.notes) && (
                <div className="border-t border-zinc-100 pt-4 space-y-2 text-sm">
                  {invoice.paymentTerms && (
                    <p className="text-zinc-500">
                      <span className="font-medium text-zinc-700">Conditions de paiement : </span>
                      {invoice.paymentTerms}
                    </p>
                  )}
                  {invoice.notes && (
                    <p className="text-zinc-500">
                      <span className="font-medium text-zinc-700">Notes : </span>
                      {invoice.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right — sidebar */}
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-700">Résumé</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Statut</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[invoice.status]}`}>
                  {STATUS_LABEL[invoice.status]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Total TTC</span>
                <span className="font-bold text-zinc-900">{eur(invoice.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Lignes</span>
                <span className="text-zinc-700">{invoice.items.length}</span>
              </div>
              {invoice.dueDate && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Échéance</span>
                  <span className="text-zinc-700">{fmtDate(invoice.dueDate)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status history placeholder */}
          {actions.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
              <h2 className="text-sm font-semibold text-zinc-700">Changer le statut</h2>
              <div className="space-y-2">
                {actions.map((action) => (
                  <button
                    key={action.status}
                    onClick={() => handleStatus(action.status)}
                    disabled={statusLoading}
                    className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${action.className}`}
                  >
                    {action.label}
                  </button>
                ))}
                {invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' && (
                  <button
                    onClick={() => handleStatus('CANCELLED')}
                    disabled={statusLoading}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-50 transition disabled:opacity-60"
                  >
                    Annuler la facture
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
