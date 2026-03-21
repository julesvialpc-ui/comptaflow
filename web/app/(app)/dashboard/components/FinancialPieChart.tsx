'use client';

function eur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

interface FinancialPieChartProps {
  revenue: number;
  expenses: number;
}

export function FinancialPieChart({ revenue, expenses }: FinancialPieChartProps) {
  const total = revenue + expenses;
  const R = 36;
  const C = 2 * Math.PI * R;
  const revenuePct = total > 0 ? revenue / total : 0.5;
  const revenueArc = revenuePct * C;
  const expensesArc = (1 - revenuePct) * C;
  const profit = revenue - expenses;

  return (
    <div className="rounded-xl border border-[#E5E4E0] bg-white p-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#888780' }}>
        Répartition annuelle
      </h2>
      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0">
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r={R} fill="none" stroke="#F0F0EE" strokeWidth="14" />
            {total > 0 && (
              <>
                <circle
                  cx="44" cy="44" r={R} fill="none"
                  stroke="#378ADD" strokeWidth="14"
                  strokeDasharray={`${revenueArc} ${C - revenueArc}`}
                  transform="rotate(-90 44 44)"
                  strokeLinecap="butt"
                />
                <circle
                  cx="44" cy="44" r={R} fill="none"
                  stroke="#F87171" strokeWidth="14"
                  strokeDasharray={`${expensesArc} ${C - expensesArc}`}
                  strokeDashoffset={-revenueArc}
                  transform="rotate(-90 44 44)"
                  strokeLinecap="butt"
                />
              </>
            )}
            <text x="44" y="41" textAnchor="middle" fontSize="9" fontWeight="700" fill="#1a1a18">
              {total > 0 ? `${Math.round(revenuePct * 100)}%` : '—'}
            </text>
            <text x="44" y="52" textAnchor="middle" fontSize="7" fill="#888780">revenus</text>
          </svg>
        </div>
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[#378ADD]" />
              <span className="text-[11px] text-zinc-500">Revenus</span>
            </div>
            <span className="text-[12px] font-semibold text-zinc-800">{eur(revenue)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-red-400" />
              <span className="text-[11px] text-zinc-500">Dépenses</span>
            </div>
            <span className="text-[12px] font-semibold text-zinc-800">{eur(expenses)}</span>
          </div>
          <div className="border-t border-zinc-100 pt-2 flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">Résultat</span>
            <span className={`text-[12px] font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {eur(profit)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
