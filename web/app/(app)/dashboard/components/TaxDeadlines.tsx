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
    <div className="rounded-lg" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
      <div className="px-4 py-3.5" style={{ borderBottom: '0.5px solid #E5E4E0' }}>
        <h2 className="text-[13px] font-medium" style={{ color: '#1a1a18' }}>Échéances fiscales</h2>
      </div>
      {deadlines.length === 0 ? (
        <p className="px-4 py-5 text-[13px]" style={{ color: '#888780' }}>Aucune échéance à venir.</p>
      ) : (
        <div>
          {deadlines.map((d, i) => {
            const urgent = d.daysRemaining !== null && d.daysRemaining <= 7;
            const soon = d.daysRemaining !== null && d.daysRemaining <= 30;
            return (
              <div key={d.id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < deadlines.length - 1 ? '0.5px solid #F0F0EE' : undefined }}>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: '#1a1a18' }}>{TAX_LABEL[d.type] ?? d.type}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#888780' }}>
                    {new Date(d.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-2.5 shrink-0">
                  {d.amount > 0 && (
                    <span className="text-[13px] font-medium" style={{ color: '#1a1a18' }}>{eur(d.amount)}</span>
                  )}
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={urgent
                      ? { background: '#FEE2E2', color: '#A32D2D' }
                      : soon
                        ? { background: '#FAEEDA', color: '#BA7517' }
                        : { background: '#E5E4E0', color: '#888780' }
                    }
                  >
                    {d.daysRemaining !== null ? d.daysRemaining === 0 ? "Aujourd'hui" : `J-${d.daysRemaining}` : '—'}
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
