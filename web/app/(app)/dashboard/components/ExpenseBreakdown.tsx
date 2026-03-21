'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ExpenseCategoryData } from '@/lib/types';
import { eur } from '@/lib/format';

const COLORS = ['#378ADD', '#9FE1CB', '#FAC775', '#F4C0D1', '#D3D1C7', '#B5D4F4', '#185FA5', '#EAF3DE'];

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
      <div className="rounded-lg p-4" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
        <h2 className="mb-2 text-[13px] font-medium" style={{ color: '#1a1a18' }}>Répartition des dépenses</h2>
        <p className="text-[13px]" style={{ color: '#888780' }}>Aucune dépense cette année.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    name: CATEGORY_FR[d.category] ?? d.category,
  }));

  return (
    <div className="rounded-lg p-4" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
      <h2 className="mb-3 text-[13px] font-medium" style={{ color: '#1a1a18' }}>Répartition des dépenses</h2>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={75}
            paddingAngle={3}
            dataKey="amount"
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color ?? COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v, name) => [eur(Number(v)), String(name)]}
            contentStyle={{ borderRadius: '6px', border: '0.5px solid #E5E4E0', fontSize: '12px', background: '#FFFFFF' }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#888780' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
