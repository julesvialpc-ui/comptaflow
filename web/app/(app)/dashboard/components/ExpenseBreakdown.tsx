'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ExpenseCategoryData } from '@/lib/types';
import { eur } from '@/lib/format';

const COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

const CATEGORY_FR: Record<string, string> = {
  OFFICE_SUPPLIES: 'Fournitures',
  TRAVEL: 'Déplacements',
  MEALS: 'Repas',
  EQUIPMENT: 'Équipement',
  SOFTWARE: 'Logiciels',
  MARKETING: 'Marketing',
  PROFESSIONAL_FEES: 'Honoraires',
  RENT: 'Loyer',
  UTILITIES: 'Charges',
  INSURANCE: 'Assurances',
  TAXES: 'Taxes',
  SALARY: 'Salaires',
  OTHER: 'Autres',
};

interface ExpenseBreakdownProps {
  data: ExpenseCategoryData[];
}

export function ExpenseBreakdown({ data }: ExpenseBreakdownProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-zinc-700">Répartition des dépenses</h2>
        <p className="text-sm text-zinc-400">Aucune dépense cette année.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    name: CATEGORY_FR[d.category] ?? d.category,
  }));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-zinc-700">Répartition des dépenses (année)</h2>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="amount"
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v, name) => [eur(Number(v)), String(name)]}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '13px' }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
