'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Invoice, InvoiceStatus } from '@/lib/types';
import { apiGetInvoices, apiDeleteInvoice, getPdfUrl } from '@/lib/invoices';
import { eur } from '@/lib/format';
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/format';

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

function token() {
  return typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const t = token();
    if (!t) { router.push('/login'); return; }

    setLoading(true);
    const filters = tab !== 'ALL' ? { status: tab as InvoiceStatus } : {};
    apiGetInvoices(t, filters)
      .then(setInvoices)
      .finally(() => setLoading(false));
  }, [tab, router]);

  const filtered = search
    ? invoices.filter(
        (inv) =>
          inv.number.toLowerCase().includes(search.toLowerCase()) ||
          (inv.client?.name ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : invoices;

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette facture ? Cette action est irréversible.')) return;
    setDeleting(id);
    try {
      await apiDeleteInvoice(token(), id);
      setInvoices((prev) => prev.filter((i) => i.id !== id));
    } catch {
      alert('Erreur lors de la suppression.');
    } finally {
      setDeleting(null);
    }
  }

  function handleDownloadPdf(id: string) {
    const t = token();
    // Fetch PDF with auth header and trigger download
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

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Factures</h1>
            <p className="text-sm text-zinc-500">{invoices.length} facture{invoices.length !== 1 ? 's' : ''}</p>
          </div>
          <Link
            href="/invoices/new"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle facture
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                tab === t.value
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-72">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 0 5 11a6 6 0 0 0 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-zinc-400">
              Chargement…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <svg className="h-10 w-10 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-zinc-400">Aucune facture trouvée</p>
              <Link href="/invoices/new" className="text-sm font-medium text-indigo-600 hover:underline">
                Créer une facture
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="py-3 pl-5 pr-3 text-left font-medium text-zinc-500">N°</th>
                  <th className="px-3 py-3 text-left font-medium text-zinc-500">Client</th>
                  <th className="px-3 py-3 text-left font-medium text-zinc-500">Émise le</th>
                  <th className="px-3 py-3 text-left font-medium text-zinc-500">Échéance</th>
                  <th className="px-3 py-3 text-right font-medium text-zinc-500">Montant</th>
                  <th className="px-3 py-3 text-center font-medium text-zinc-500">Statut</th>
                  <th className="py-3 pl-3 pr-5 text-right font-medium text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="group hover:bg-zinc-50 transition">
                    <td className="py-3 pl-5 pr-3 font-mono text-xs font-medium text-zinc-700">
                      {inv.number}
                    </td>
                    <td className="px-3 py-3 text-zinc-800">
                      {inv.client?.name ?? <span className="text-zinc-400 italic">Sans client</span>}
                    </td>
                    <td className="px-3 py-3 text-zinc-500">{fmtDate(inv.issueDate)}</td>
                    <td className="px-3 py-3 text-zinc-500">{fmtDate(inv.dueDate)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-zinc-900">
                      {eur(inv.total)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[inv.status]}`}>
                        {STATUS_LABEL[inv.status]}
                      </span>
                    </td>
                    <td className="py-3 pl-3 pr-5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                        {/* View */}
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
                          title="Voir"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        {/* PDF */}
                        <button
                          onClick={() => handleDownloadPdf(inv.id)}
                          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
                          title="Télécharger PDF"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(inv.id)}
                          disabled={deleting === inv.id}
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
      </main>
    </div>
  );
}
