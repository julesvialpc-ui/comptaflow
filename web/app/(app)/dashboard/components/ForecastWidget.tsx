'use client';

import { useEffect, useState } from 'react';
import { ForecastMonth } from '@/lib/types';
import { eur } from '@/lib/format';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export function ForecastWidget() {
  const [data, setData] = useState<ForecastMonth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') ?? '';
    if (!token) { setLoading(false); return; }
    fetch(`${API}/dashboard/forecast`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmtMonth = (m: string) => {
    const d = new Date(m + '-01');
    return d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="rounded-lg p-4" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
      <h3 className="text-[13px] font-medium mb-3" style={{ color: '#1a1a18' }}>Pr\u00e9visions 3 mois</h3>
      {loading ? (
        <div className="flex items-center justify-center py-8 text-[13px]" style={{ color: '#888780' }}>Chargement\u2026</div>
      ) : data.length === 0 ? (
        <p className="text-[12px] py-4" style={{ color: '#888780' }}>Aucune donn\u00e9e disponible</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {data.slice(0, 3).map(month => (
            <div key={month.month} className="rounded-md p-3" style={{ background: '#F5F5F3' }}>
              <p className="text-[11px] font-medium mb-2 capitalize" style={{ color: '#888780' }}>{fmtMonth(month.month)}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span style={{ color: '#378ADD' }}>Revenus</span>
                  <span className="font-medium" style={{ color: '#378ADD' }}>{eur(month.projectedRevenue)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span style={{ color: '#DC2626' }}>D\u00e9penses</span>
                  <span className="font-medium" style={{ color: '#DC2626' }}>{eur(month.projectedExpenses)}</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1" style={{ borderTop: '0.5px solid #E5E4E0' }}>
                  <span style={{ color: '#888780' }}>B\u00e9n\u00e9fice</span>
                  <span className="font-medium" style={{ color: month.projectedProfit >= 0 ? '#3B6D11' : '#DC2626' }}>
                    {eur(month.projectedProfit)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
