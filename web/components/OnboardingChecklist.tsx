'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

interface Step {
  id: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
}

export default function OnboardingChecklist() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('onboarding_dismissed') === '1') {
      setDismissed(true);
      setLoading(false);
      return;
    }
    const token = localStorage.getItem('accessToken') ?? '';
    if (!token) { setLoading(false); return; }
    const h = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API}/businesses/me`, { headers: h }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/invoices?limit=1`, { headers: h }).then(r => r.ok ? r.json() : []),
      fetch(`${API}/clients?limit=1`, { headers: h }).then(r => r.ok ? r.json() : []),
    ]).then(([biz, invoices, clients]) => {
      const hasName = biz?.name && biz.name !== '';
      const hasLegalInfo = biz?.siret || biz?.siren;
      const hasInvoice = Array.isArray(invoices) && invoices.length > 0;
      const hasClient = Array.isArray(clients) && clients.length > 0;

      setSteps([
        { id: 'profile', label: 'Configurer votre entreprise', hint: 'Nom, SIRET, adresse…', href: '/settings', done: !!hasName },
        { id: 'legal', label: 'Renseigner vos infos légales', hint: 'SIRET ou SIREN', href: '/settings', done: !!hasLegalInfo },
        { id: 'client', label: 'Ajouter votre premier client', hint: 'Nom, email, téléphone', href: '/clients/new', done: !!hasClient },
        { id: 'invoice', label: 'Créer votre première facture', hint: 'PDF généré automatiquement', href: '/invoices/new', done: !!hasInvoice },
      ]);
    }).catch(() => setSteps([])).finally(() => setLoading(false));
  }, []);

  function dismiss() {
    localStorage.setItem('onboarding_dismissed', '1');
    setDismissed(true);
  }

  if (loading || dismissed || steps.length === 0) return null;
  const done = steps.filter(s => s.done).length;
  if (done === steps.length) return null;

  const pct = Math.round((done / steps.length) * 100);

  return (
    <div className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[13px] font-semibold" style={{ color: '#1a1a18' }}>Démarrage — {done}/{steps.length} étapes</h3>
          <p className="text-[11px]" style={{ color: '#888780' }}>Complétez votre configuration pour tirer le meilleur de Konta</p>
        </div>
        <button onClick={dismiss} className="text-[11px] underline" style={{ color: '#888780' }}>Ignorer</button>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-1.5 rounded-full overflow-hidden" style={{ background: '#F5F5F3' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#378ADD' }} />
      </div>

      <div className="space-y-1.5">
        {steps.map((s) => (
          <Link key={s.id} href={s.href} className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-zinc-50">
            <span
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px]"
              style={s.done
                ? { background: '#F0F9EC', color: '#3B6D11', border: '1.5px solid #3B6D11' }
                : { background: '#F5F5F3', color: '#888780', border: '1.5px solid #C8C6C2' }
              }
            >
              {s.done ? '✓' : ''}
            </span>
            <div>
              <p className="text-[12px] font-medium" style={{ color: s.done ? '#888780' : '#1a1a18', textDecoration: s.done ? 'line-through' : 'none' }}>
                {s.label}
              </p>
              <p className="text-[11px]" style={{ color: '#888780' }}>{s.hint}</p>
            </div>
            {!s.done && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="ml-auto flex-shrink-0" style={{ color: '#C8C6C2' }}>
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
