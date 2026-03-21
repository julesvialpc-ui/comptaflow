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
    <div className="rounded-lg p-4" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[11px] mb-1" style={{ color: '#888780' }}>{label}</p>
          <p className="text-[18px] font-medium" style={{ color: variant === 'success' ? '#3B6D11' : variant === 'danger' ? '#A32D2D' : variant === 'warning' ? '#BA7517' : '#185FA5' }}>
            {eur(value)}
          </p>
          {subtitle && <p className="text-[10px] mt-0.5" style={{ color: '#888780' }}>{subtitle}</p>}
        </div>
      </div>

      {growth !== null && growth !== undefined && (
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className="text-[10px]"
            style={{ color: isPositive ? '#3B6D11' : isNegative ? '#A32D2D' : '#888780' }}
          >
            {isPositive ? '+' : ''}{pct(growth)} vs mois dernier
          </span>
        </div>
      )}
    </div>
  );
}
