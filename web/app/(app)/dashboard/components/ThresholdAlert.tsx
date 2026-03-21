'use client';

import { eur } from '@/lib/format';

interface ThresholdAlertProps {
  yearRevenue: number;
  limit: number;
  progress: number;
  isNearLimit: boolean;
}

export function ThresholdAlert({ yearRevenue, limit, progress, isNearLimit }: ThresholdAlertProps) {
  if (!isNearLimit) return null;

  return (
    <div className="rounded-lg p-4" style={{ background: '#FAEEDA', border: '0.5px solid #F5D5A0' }}>
      <div className="flex items-start gap-3">
        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#BA7517' }} />
        <div className="flex-1">
          <p className="text-[13px] font-medium" style={{ color: '#854F0B' }}>
            Seuil micro-entreprise bientôt atteint
          </p>
          <p className="mt-0.5 text-[12px]" style={{ color: '#A8610E' }}>
            Votre CA annuel ({eur(yearRevenue)}) représente {progress}% du plafond de {eur(limit)}.
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: '#F5D5A0' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%`, background: '#BA7517' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
