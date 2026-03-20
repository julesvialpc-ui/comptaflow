'use client';

import { useEffect, useState } from 'react';
import { DashboardData } from '@/lib/types';
import { eur } from '@/lib/format';
import { StatCard } from './components/StatCard';
import { RevenueChart } from './components/RevenueChart';
import { ExpenseBreakdown } from './components/ExpenseBreakdown';
import { InvoiceTable } from './components/InvoiceTable';
import { TaxDeadlines } from './components/TaxDeadlines';
import { ThresholdAlert } from './components/ThresholdAlert';

// ─── Icons ─────────────────────────────────────────────────────────────────

const IconRevenue = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);
const IconExpenses = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17H5m0 0V9m0 8l8-8 4 4 6-6" />
  </svg>
);
const IconProfit = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconInvoice = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// ─── Demo token (replace with real auth) ────────────────────────────────────
// In production, read from cookie/context: document.cookie, useSession(), etc.
const DEMO_TOKEN = typeof window !== 'undefined'
  ? localStorage.getItem('accessToken') ?? ''
  : '';

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') ?? '';
    if (!token) {
      setError('Non authentifié. Connectez-vous pour accéder au dashboard.');
      setLoading(false);
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json() as Promise<DashboardData>;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-zinc-500">Chargement du dashboard…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-700">{error ?? 'Données indisponibles'}</p>
        </div>
      </div>
    );
  }

  const { kpis, unpaidTotal, overdueTotal, recentInvoices, taxDeadlines, expenseBreakdown, monthlyRevenue, threshold } = data;
  const { currentMonth, currentYear } = kpis;

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">ComptaFlow</h1>
            <p className="text-xs text-zinc-400">Dashboard financier</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">

        {/* Alert seuil */}
        <ThresholdAlert {...threshold} />

        {/* KPIs — mois en cours */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Ce mois-ci
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Chiffre d'affaires"
              value={currentMonth.revenue}
              growth={currentMonth.revenueGrowth}
              variant="default"
              icon={<IconRevenue />}
            />
            <StatCard
              label="Dépenses"
              value={currentMonth.expenses}
              growth={currentMonth.expensesGrowth}
              variant="danger"
              icon={<IconExpenses />}
            />
            <StatCard
              label="Bénéfice net"
              value={currentMonth.profit}
              variant={currentMonth.profit >= 0 ? 'success' : 'danger'}
              icon={<IconProfit />}
            />
            <StatCard
              label="Impayés"
              value={unpaidTotal}
              subtitle={overdueTotal > 0 ? `dont ${eur(overdueTotal)} en retard` : undefined}
              variant={overdueTotal > 0 ? 'warning' : 'default'}
              icon={<IconInvoice />}
            />
          </div>
        </section>

        {/* KPIs — année */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Année en cours
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-zinc-500">CA annuel</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{eur(currentYear.revenue)}</p>
              <p className="mt-1 text-xs text-zinc-400">{currentYear.invoiceCount} facture(s) payée(s)</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-zinc-500">Charges annuelles</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{eur(currentYear.expenses)}</p>
            </div>
            <div className={`rounded-xl border p-5 shadow-sm ${currentYear.profit >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              <p className="text-sm text-zinc-500">Résultat annuel</p>
              <p className={`mt-1 text-2xl font-bold ${currentYear.profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {eur(currentYear.profit)}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Marge {currentYear.revenue > 0 ? Math.round((currentYear.profit / currentYear.revenue) * 100) : 0}%
              </p>
            </div>
          </div>
        </section>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueChart data={monthlyRevenue} />
          </div>
          <ExpenseBreakdown data={expenseBreakdown} />
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <InvoiceTable invoices={recentInvoices} />
          <TaxDeadlines deadlines={taxDeadlines} />
        </div>

      </main>
    </div>
  );
}
