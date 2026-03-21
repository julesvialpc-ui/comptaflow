'use client';

import { useEffect, useState } from 'react';
import { DashboardData } from '@/lib/types';
import { eur } from '@/lib/format';
import { StatCard } from './components/StatCard';
import { RevenueChart } from './components/RevenueChart';
import { ExpenseBreakdown } from './components/ExpenseBreakdown';
import { RevenuePieChart } from './components/RevenuePieChart';
import { FinancialPieChart } from './components/FinancialPieChart';
import { InvoiceTable } from './components/InvoiceTable';
import { TaxDeadlines } from './components/TaxDeadlines';
import { ThresholdAlert } from './components/ThresholdAlert';
import { UrssafWidget } from './components/UrssafWidget';
import { ForecastWidget } from './components/ForecastWidget';
import { IrEstimateWidget } from './components/IrEstimateWidget';

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: '#378ADD', borderTopColor: 'transparent' }} />
          <p className="text-[13px]" style={{ color: '#888780' }}>Chargement…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-lg px-6 py-4 text-center" style={{ background: '#FEF2F2', border: '0.5px solid #FECACA' }}>
          <p className="text-[13px] font-medium" style={{ color: '#DC2626' }}>{error ?? 'Données indisponibles'}</p>
        </div>
      </div>
    );
  }

  const { kpis, unpaidTotal, overdueTotal, recentInvoices, taxDeadlines, expenseBreakdown, revenueBreakdown, monthlyRevenue, threshold } = data;
  const { currentMonth, currentYear } = kpis;

  return (
    <div className="p-6 space-y-6">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-medium" style={{ color: '#1a1a18' }}>Dashboard</h1>
          <p className="text-[12px] mt-0.5" style={{ color: '#888780' }}>
            {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Alert seuil */}
      <ThresholdAlert {...threshold} />

      {/* KPIs — mois en cours */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: '#888780' }}>Ce mois-ci</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Chiffre d'affaires" value={currentMonth.revenue} growth={currentMonth.revenueGrowth} variant="default" icon={<IconRevenue />} />
          <StatCard label="Dépenses" value={currentMonth.expenses} growth={currentMonth.expensesGrowth} variant="danger" icon={<IconExpenses />} />
          <StatCard label="Bénéfice net" value={currentMonth.profit} variant={currentMonth.profit >= 0 ? 'success' : 'danger'} icon={<IconProfit />} />
          <StatCard label="Impayés" value={unpaidTotal} subtitle={overdueTotal > 0 ? `dont ${eur(overdueTotal)} en retard` : undefined} variant={overdueTotal > 0 ? 'warning' : 'default'} icon={<IconInvoice />} />
        </div>
      </section>

      {/* KPIs — année */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: '#888780' }}>Année en cours</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg p-4" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
            <p className="text-[11px] mb-1" style={{ color: '#888780' }}>CA annuel</p>
            <div className="flex items-center gap-2">
              <p className="text-[18px] font-medium" style={{ color: '#185FA5' }}>{eur(currentYear.revenue)}</p>
              {kpis.yearGrowth != null && (
                <span
                  className="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    background: kpis.yearGrowth >= 0 ? '#F0F9EC' : '#FEF2F2',
                    color: kpis.yearGrowth >= 0 ? '#3B6D11' : '#DC2626',
                  }}
                >
                  {kpis.yearGrowth > 0 ? '+' : ''}{kpis.yearGrowth}%
                </span>
              )}
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: '#888780' }}>{currentYear.invoiceCount} facture(s) payée(s)</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
            <p className="text-[11px] mb-1" style={{ color: '#888780' }}>Charges annuelles</p>
            <p className="text-[18px] font-medium" style={{ color: '#1a1a18' }}>{eur(currentYear.expenses)}</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: currentYear.profit >= 0 ? '#F0F9EC' : '#FEF2F2', border: `0.5px solid ${currentYear.profit >= 0 ? '#D3EEC4' : '#FECACA'}` }}>
            <p className="text-[11px] mb-1" style={{ color: '#888780' }}>Résultat annuel</p>
            <p className="text-[18px] font-medium" style={{ color: currentYear.profit >= 0 ? '#3B6D11' : '#A32D2D' }}>{eur(currentYear.profit)}</p>
            <p className="text-[10px] mt-0.5" style={{ color: '#888780' }}>
              Marge {currentYear.revenue > 0 ? Math.round((currentYear.profit / currentYear.revenue) * 100) : 0}%
            </p>
          </div>
        </div>
      </section>

      {/* Charts */}
      <div className="space-y-3">
        <RevenueChart data={monthlyRevenue} />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <FinancialPieChart revenue={currentYear.revenue} expenses={currentYear.expenses} />
          <ExpenseBreakdown data={expenseBreakdown} />
          <RevenuePieChart data={revenueBreakdown} />
        </div>
      </div>

      {/* Forecast & IR */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ForecastWidget />
        <IrEstimateWidget />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <InvoiceTable invoices={recentInvoices} />
        <TaxDeadlines deadlines={taxDeadlines} />
        <UrssafWidget />
      </div>
    </div>
  );
}
