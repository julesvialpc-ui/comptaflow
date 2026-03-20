'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { MonthlyPoint } from '@/lib/types';
import { shortMonth } from '@/lib/format';

interface RevenueChartProps {
  data: MonthlyPoint[];
}

const euroFormatter = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${v}€`;

export function RevenueChart({ data }: RevenueChartProps) {
  const formatted = data.map((d) => ({ ...d, month: shortMonth(d.month) }));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-zinc-700">
        Revenus & Dépenses — 12 derniers mois
      </h2>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={euroFormatter} tick={{ fontSize: 12, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value, name) => [
              new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(value)),
              name === 'revenue' ? 'Revenus' : 'Dépenses',
            ]}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '13px' }}
          />
          <Legend
            formatter={(v) => (v === 'revenue' ? 'Revenus' : 'Dépenses')}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px' }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#gradRevenue)" dot={false} activeDot={{ r: 4 }} />
          <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} fill="url(#gradExpenses)" dot={false} activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
