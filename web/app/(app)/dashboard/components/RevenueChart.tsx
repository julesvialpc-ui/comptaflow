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
    <div className="rounded-lg p-4" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
      <h2 className="mb-4 text-[13px] font-medium" style={{ color: '#1a1a18' }}>
        Revenus & Dépenses — 12 derniers mois
      </h2>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#378ADD" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#378ADD" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F4C0D1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#F4C0D1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EE" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#888780' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={euroFormatter} tick={{ fontSize: 11, fill: '#888780' }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value, name) => [
              new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(value)),
              name === 'revenue' ? 'Revenus' : 'Dépenses',
            ]}
            contentStyle={{ borderRadius: '6px', border: '0.5px solid #E5E4E0', fontSize: '12px', background: '#FFFFFF' }}
          />
          <Legend
            formatter={(v) => (v === 'revenue' ? 'Revenus' : 'Dépenses')}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '11px', color: '#888780' }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#378ADD" strokeWidth={1.5} fill="url(#gradRevenue)" dot={false} activeDot={{ r: 3 }} />
          <Area type="monotone" dataKey="expenses" stroke="#F4C0D1" strokeWidth={1.5} fill="url(#gradExpenses)" dot={false} activeDot={{ r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
