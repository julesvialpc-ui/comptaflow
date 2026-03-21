'use client';

import { useEffect, useState } from 'react';
import { IrEstimate } from '@/lib/types';
import { eur } from '@/lib/format';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export function IrEstimateWidget() {
  const [data, setData] = useState<IrEstimate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') ?? '';
    if (!token) { setLoading(false); return; }
    fetch(`${API}/dashboard/ir-estimate`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-lg p-4" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
      <h3 className="text-[13px] font-medium mb-3" style={{ color: '#1a1a18' }}>Estimation fiscale annuelle</h3>
      {loading ? (
        <div className="flex items-center justify-center py-8 text-[13px]" style={{ color: '#888780' }}>Chargement\u2026</div>
      ) : !data ? (
        <p className="text-[12px] py-4" style={{ color: '#888780' }}>Aucune donn\u00e9e disponible</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md p-2.5" style={{ background: '#F5F5F3' }}>
              <p className="text-[10px]" style={{ color: '#888780' }}>CA annuel</p>
              <p className="text-[14px] font-medium" style={{ color: '#185FA5' }}>{eur(data.yearRevenue)}</p>
            </div>
            <div className="rounded-md p-2.5" style={{ background: '#F5F5F3' }}>
              <p className="text-[10px]" style={{ color: '#888780' }}>Abattement 34%</p>
              <p className="text-[14px] font-medium" style={{ color: '#1a1a18' }}>{eur(data.abatement)}</p>
            </div>
            <div className="rounded-md p-2.5" style={{ background: '#F5F5F3' }}>
              <p className="text-[10px]" style={{ color: '#888780' }}>Revenu imposable</p>
              <p className="text-[14px] font-medium" style={{ color: '#1a1a18' }}>{eur(data.taxableIncome)}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md p-2.5" style={{ background: '#FEF2F2' }}>
              <p className="text-[10px]" style={{ color: '#888780' }}>IR estim\u00e9 (22%)</p>
              <p className="text-[14px] font-medium" style={{ color: '#DC2626' }}>{eur(data.irEstimate)}</p>
            </div>
            <div className="rounded-md p-2.5" style={{ background: '#FEF2F2' }}>
              <p className="text-[10px]" style={{ color: '#888780' }}>URSSAF (21.2%)</p>
              <p className="text-[14px] font-medium" style={{ color: '#DC2626' }}>{eur(data.urssafDeductible)}</p>
            </div>
            <div className="rounded-md p-2.5" style={{ background: '#F0F9EC' }}>
              <p className="text-[10px]" style={{ color: '#888780' }}>Net apr\u00e8s charges</p>
              <p className="text-[14px] font-medium" style={{ color: '#3B6D11' }}>{eur(data.netAfterTax)}</p>
            </div>
          </div>
          {data.disclaimer && (
            <p className="text-[10px]" style={{ color: '#888780' }}>{data.disclaimer}</p>
          )}
        </div>
      )}
    </div>
  );
}
