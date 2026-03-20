'use client';

import { TaxDeadline } from '@/lib/types';
import { eur } from '@/lib/format';

const TAX_LABEL: Record<string, string> = {
  TVA: 'TVA',
  IS: 'Impôt sur les sociétés',
  IR: 'Impôt sur le revenu',
  URSSAF: 'Cotisations URSSAF',
  CFE: 'CFE',
  OTHER: 'Déclaration fiscale',
};

interface TaxDeadlinesProps {
  deadlines: TaxDeadline[];
}

export function TaxDeadlines({ deadlines }: TaxDeadlinesProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-zinc-700">Échéances fiscales</h2>
      </div>
      {deadlines.length === 0 ? (
        <p className="px-5 py-6 text-sm text-zinc-400">Aucune échéance à venir.</p>
      ) : (
        <div className="divide-y divide-zinc-50">
          {deadlines.map((d) => {
            const urgent = d.daysRemaining !== null && d.daysRemaining <= 7;
            const soon = d.daysRemaining !== null && d.daysRemaining <= 30;
            return (
              <div key={d.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{TAX_LABEL[d.type] ?? d.type}</p>
                  <p className="text-xs text-zinc-400">
                    {new Date(d.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-3 shrink-0">
                  {d.amount > 0 && (
                    <span className="text-sm font-semibold text-zinc-700">{eur(d.amount)}</span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      urgent
                        ? 'bg-red-100 text-red-700'
                        : soon
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {d.daysRemaining !== null
                      ? d.daysRemaining === 0
                        ? "Aujourd'hui"
                        : `J-${d.daysRemaining}`
                      : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
