'use client';

import { useEffect, useState } from 'react';
import { UrssafData } from '@/lib/types';
import { eur } from '@/lib/format';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export function UrssafWidget() {
  const [data, setData] = useState<UrssafData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') ?? '';
    if (!token) { setLoading(false); return; }

    fetch(`${API}/dashboard/urssaf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const deadlineColor = (days: number) => {
    if (days > 30) return { bg: '#F0F9EC', border: '#D3EEC4', text: '#3B6D11', badge: '#D3EEC4' };
    if (days >= 10) return { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', badge: '#FDE68A' };
    return { bg: '#FEF2F2', border: '#FECACA', text: '#A32D2D', badge: '#FECACA' };
  };

  if (loading) {
    return (
      <div className="rounded-lg p-4 flex items-center justify-center" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0', minHeight: 180 }}>
        <span className="h-5 w-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#378ADD', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg p-4" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
        <h2 className="mb-2 text-[13px] font-medium" style={{ color: '#1a1a18' }}>Estimation URSSAF</h2>
        <p className="text-[12px]" style={{ color: '#888780' }}>Données indisponibles.</p>
      </div>
    );
  }

  const colors = deadlineColor(data.daysUntilDeadline);

  return (
    <div className="rounded-lg p-4 flex flex-col gap-3" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-medium" style={{ color: '#1a1a18' }}>Estimation URSSAF</h2>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#E6F1FB', color: '#378ADD' }}>
          {data.quarter}
        </span>
      </div>

      {/* Current quarter */}
      <div className="rounded-md p-3 space-y-1.5" style={{ background: '#F8F8F7', border: '0.5px solid #E5E4E0' }}>
        <p className="text-[11px]" style={{ color: '#888780' }}>{data.periodLabel}</p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px]" style={{ color: '#888780' }}>CA trimestriel</p>
            <p className="text-[18px] font-semibold tabular-nums" style={{ color: '#185FA5' }}>{eur(data.currentQuarterRevenue)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px]" style={{ color: '#888780' }}>Cotisation estimée</p>
            <p className="text-[18px] font-semibold tabular-nums" style={{ color: '#1a1a18' }}>{eur(data.urssafEstimate)}</p>
          </div>
        </div>
      </div>

      {/* Deadline */}
      <div className="rounded-md px-3 py-2 flex items-center justify-between" style={{ background: colors.bg, border: `0.5px solid ${colors.border}` }}>
        <div>
          <p className="text-[11px] font-medium" style={{ color: colors.text }}>
            Déclaration avant le {new Date(data.declarationDeadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: colors.badge, color: colors.text }}>
          {data.daysUntilDeadline > 0 ? `J-${data.daysUntilDeadline}` : 'Échu'}
        </span>
      </div>

      {/* Previous quarters */}
      {data.previousQuarters.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#888780' }}>Trimestres précédents</p>
          <div className="space-y-1">
            {data.previousQuarters.map((q) => (
              <div key={q.quarter + q.label} className="flex items-center justify-between text-[12px]">
                <span style={{ color: '#888780' }}>{q.quarter} — {q.label.split(' — ')[0]}</span>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums" style={{ color: '#888780' }}>{eur(q.revenue)}</span>
                  <span className="tabular-nums font-medium" style={{ color: '#1a1a18' }}>{eur(q.urssafEstimate)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rate note */}
      <p className="text-[10px] italic" style={{ color: '#888780' }}>
        Taux applicable : 21,2 % (prestations de services)
      </p>
    </div>
  );
}
