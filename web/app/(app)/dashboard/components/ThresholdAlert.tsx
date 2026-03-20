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
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <span className="text-lg">⚠️</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">
            Seuil micro-entreprise bientôt atteint
          </p>
          <p className="mt-0.5 text-xs text-amber-700">
            Votre CA annuel ({eur(yearRevenue)}) représente {progress}% du plafond de {eur(limit)}.
            Au-delà, vous perdez le régime micro-fiscal.
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-200">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
