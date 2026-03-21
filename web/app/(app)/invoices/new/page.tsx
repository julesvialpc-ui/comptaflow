'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Client } from '@/lib/types';
import { apiGetClients } from '@/lib/clients';
import { apiCreateInvoice, apiNextInvoiceNumber, CreateInvoicePayload } from '@/lib/invoices';
import { eur } from '@/lib/format';

// ─── Item row state ───────────────────────────────────────────────────────────

interface ItemRow {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
}

let rowId = 0;

function newRow(): ItemRow {
  return { id: ++rowId, description: '', quantity: '1', unitPrice: '', vatRate: '0' };
}

function token() {
  return typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NewInvoicePage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [number, setNumber] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [globalVat, setGlobalVat] = useState('20');
  const [notes, setNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [items, setItems] = useState<ItemRow[]>([newRow()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch next number + clients on mount
  useEffect(() => {
    const t = token();
    if (!t) { router.push('/login'); return; }
    Promise.all([
      apiNextInvoiceNumber(t),
      apiGetClients(t),
    ]).then(([num, cls]) => {
      setNumber(num);
      setClients(cls.filter((c) => c.isActive));
    });
  }, [router]);

  // Totals
  const rows = items.map((row) => {
    const qty = parseFloat(row.quantity) || 0;
    const price = parseFloat(row.unitPrice) || 0;
    const vat = parseFloat(row.vatRate) || 0;
    return { qty, price, vat, subtotalLine: qty * price };
  });
  const subtotal = rows.reduce((s, r) => s + r.subtotalLine, 0);
  const vatRate = parseFloat(globalVat) || 0;
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  // Item helpers
  function updateItem(id: number, field: keyof Omit<ItemRow, 'id'>, value: string) {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }
  function addItem() {
    setItems((prev) => [...prev, newRow()]);
  }
  function removeItem(id: number) {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSubmit(status: 'DRAFT' | 'SENT') {
    setError('');
    if (!number.trim()) { setError('Le numéro de facture est requis.'); return; }
    if (items.some((r) => !r.description.trim())) { setError('Chaque ligne doit avoir une description.'); return; }
    if (items.some((r) => !r.unitPrice || parseFloat(r.unitPrice) <= 0)) {
      setError('Chaque ligne doit avoir un prix unitaire > 0.');
      return;
    }

    setLoading(true);
    try {
      const payload: CreateInvoicePayload = {
        number,
        status,
        clientId: clientId || undefined,
        issueDate: issueDate || undefined,
        dueDate: dueDate || undefined,
        vatRate: vatRate,
        notes: notes || undefined,
        paymentTerms: paymentTerms || undefined,
        items: items.map((r) => ({
          description: r.description,
          quantity: parseFloat(r.quantity) || 1,
          unitPrice: parseFloat(r.unitPrice) || 0,
          vatRate: parseFloat(r.vatRate) || 0,
        })),
      };
      const created = await apiCreateInvoice(token(), payload);
      router.push(`/invoices/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <header className="border-b border-[#E5E4E0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/invoices" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-zinc-900">Nouvelle facture</h1>
              <p className="text-sm text-zinc-500">Remplissez les informations puis enregistrez</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6 space-y-6">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* Left — main form */}
          <div className="col-span-2 space-y-6">

            {/* Meta */}
            <section className="rounded-xl border border-[#E5E4E0] bg-white p-5 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-700">Informations générales</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">N° de facture <span className="text-red-500">*</span></label>
                  <input
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono focus:border-[#378ADD] focus:outline-none focus:ring-2 focus:ring-[#E6F1FB]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">Client</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full rounded-lg border border-[#E5E4E0] bg-white px-3 py-2 text-sm focus:border-[#378ADD] focus:outline-none focus:ring-2 focus:ring-[#E6F1FB]"
                  >
                    <option value="">— Sans client —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">Date d'émission</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#378ADD] focus:outline-none focus:ring-2 focus:ring-[#E6F1FB]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">Date d'échéance</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#378ADD] focus:outline-none focus:ring-2 focus:ring-[#E6F1FB]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">Taux TVA global (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={globalVat}
                    onChange={(e) => setGlobalVat(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#378ADD] focus:outline-none focus:ring-2 focus:ring-[#E6F1FB]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">Conditions de paiement</label>
                  <input
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="Ex : 30 jours net"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#378ADD] focus:outline-none focus:ring-2 focus:ring-[#E6F1FB]"
                  />
                </div>
              </div>
            </section>

            {/* Items */}
            <section className="rounded-xl border border-[#E5E4E0] bg-white overflow-hidden">
              <div className="border-b border-zinc-100 px-5 py-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-700">Lignes de facturation</h2>
              </div>

              {/* Header */}
              <div className="grid grid-cols-[1fr_64px_100px_64px_80px_32px] gap-2 bg-zinc-50 px-5 py-2 text-xs font-medium text-zinc-400">
                <span>Description</span>
                <span className="text-center">Qté</span>
                <span className="text-right">Prix unit. HT</span>
                <span className="text-center">TVA %</span>
                <span className="text-right">Total HT</span>
                <span />
              </div>

              <div className="divide-y divide-zinc-100">
                {items.map((row) => {
                  const qty = parseFloat(row.quantity) || 0;
                  const price = parseFloat(row.unitPrice) || 0;
                  const lineTotal = qty * price;
                  return (
                    <div key={row.id} className="grid grid-cols-[1fr_64px_100px_64px_80px_32px] gap-2 items-center px-5 py-2">
                      <input
                        value={row.description}
                        onChange={(e) => updateItem(row.id, 'description', e.target.value)}
                        placeholder="Description du service ou produit"
                        className="w-full rounded border border-zinc-200 px-2.5 py-1.5 text-sm focus:border-[#378ADD] focus:outline-none focus:ring-1 focus:ring-[#E6F1FB]"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={row.quantity}
                        onChange={(e) => updateItem(row.id, 'quantity', e.target.value)}
                        className="w-full rounded border border-zinc-200 px-2 py-1.5 text-center text-sm focus:border-[#378ADD] focus:outline-none focus:ring-1 focus:ring-[#E6F1FB]"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.unitPrice}
                        onChange={(e) => updateItem(row.id, 'unitPrice', e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded border border-zinc-200 px-2 py-1.5 text-right text-sm focus:border-[#378ADD] focus:outline-none focus:ring-1 focus:ring-[#E6F1FB]"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={row.vatRate}
                        onChange={(e) => updateItem(row.id, 'vatRate', e.target.value)}
                        className="w-full rounded border border-zinc-200 px-2 py-1.5 text-center text-sm focus:border-[#378ADD] focus:outline-none focus:ring-1 focus:ring-[#E6F1FB]"
                      />
                      <span className="text-right text-sm text-zinc-700 tabular-nums">
                        {lineTotal > 0 ? eur(lineTotal) : '—'}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(row.id)}
                        disabled={items.length === 1}
                        className="flex items-center justify-center rounded p-1 text-zinc-300 hover:bg-red-50 hover:text-red-400 transition disabled:opacity-20"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-zinc-100 px-5 py-3">
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1.5 text-sm font-medium text-[#378ADD] hover:opacity-80 transition"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter une ligne
                </button>
              </div>
            </section>

            {/* Notes */}
            <section className="rounded-xl border border-[#E5E4E0] bg-white p-5 space-y-1">
              <label className="text-xs font-medium text-zinc-500">Notes (facultatif)</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Mentions légales, informations complémentaires…"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm resize-none focus:border-[#378ADD] focus:outline-none focus:ring-2 focus:ring-[#E6F1FB]"
              />
            </section>
          </div>

          {/* Right — totals + actions */}
          <div className="space-y-4">
            {/* Totals */}
            <section className="rounded-xl border border-[#E5E4E0] bg-white p-5 space-y-3">
              <h2 className="text-sm font-semibold text-zinc-700">Récapitulatif</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-zinc-600">
                  <span>Sous-total HT</span>
                  <span className="tabular-nums">{eur(subtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>TVA ({globalVat} %)</span>
                  <span className="tabular-nums">{eur(vatAmount)}</span>
                </div>
                <div className="border-t border-zinc-100 pt-2 flex justify-between font-bold text-zinc-900">
                  <span>Total TTC</span>
                  <span className="tabular-nums">{eur(total)}</span>
                </div>
              </div>
            </section>

            {/* Actions */}
            <section className="rounded-xl border border-[#E5E4E0] bg-white p-5 space-y-3">
              <button
                type="button"
                onClick={() => handleSubmit('SENT')}
                disabled={loading}
                className="w-full rounded-lg bg-[#378ADD] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Enregistrement…' : 'Enregistrer et envoyer'}
              </button>
              <button
                type="button"
                onClick={() => handleSubmit('DRAFT')}
                disabled={loading}
                className="w-full rounded-lg border border-[#E5E4E0] bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Enregistrer en brouillon
              </button>
              <Link
                href="/invoices"
                className="block w-full text-center text-sm text-zinc-400 hover:text-zinc-600 transition"
              >
                Annuler
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
