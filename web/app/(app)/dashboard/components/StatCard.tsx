'use client';

import { eur, pct } from '@/lib/format';

interface StatCardProps {
  label: string;
  value: number;
  growth?: number | null;
  subtitle?: string;
  variant?: 'default' | 'success' | 'danger' | 'warning';
  icon: React.ReactNode;
}

export function StatCard({ label, value, growth, subtitle, variant = 'default', icon }: StatCardProps) {
  const isPositive = growth !== null && growth !== undefined && growth > 0;
  const isNegative = growth !== null && growth !== undefined && growth < 0;

  const variantBg: Record<string, string> = {
    default: 'bg-white',
    success: 'bg-emerald-50',
    danger: 'bg-red-50',
    warning: 'bg-amber-50',
  };

  const variantIcon: Record<string, string> = {
    default: 'bg-indigo-50 text-indigo-600',
    success: 'bg-emerald-100 text-emerald-600',
    danger: 'bg-red-100 text-red-600',
    warning: 'bg-amber-100 text-amber-600',
  };

  return (
    <div className={`rounded-xl border border-zinc-200 p-5 shadow-sm ${variantBg[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">{eur(value)}</p>
          {subtitle && <p className="mt-0.5 text-xs text-zinc-400">{subtitle}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${variantIcon[variant]}`}>
          {icon}
        </div>
      </div>

      {growth !== null && growth !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              isPositive
                ? 'bg-emerald-100 text-emerald-700'
                : isNegative
                  ? 'bg-red-100 text-red-700'
                  : 'bg-zinc-100 text-zinc-600'
            }`}
          >
            {isPositive ? '↑' : isNegative ? '↓' : '→'} {pct(growth)}
          </span>
          <span className="text-xs text-zinc-400">vs mois dernier</span>
        </div>
      )}
    </div>
  );
}
