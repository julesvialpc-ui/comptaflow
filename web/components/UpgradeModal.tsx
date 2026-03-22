'use client';

import { useState } from 'react';
import { apiCreateCheckout } from '@/lib/subscriptions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

const PRO_FEATURES = [
  'Factures, devis et clients illimités',
  'Suivi du temps (time tracking)',
  'Assistant IA pour vos finances',
  'Budgets & prévisions',
  'Notifications automatiques',
  'Estimations URSSAF & IR',
  'Dashboard avancé (N vs N-1)',
  'Support prioritaire',
];

export default function UpgradeModal({ isOpen, onClose, title, description }: Props) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleUpgrade() {
    const token = localStorage.getItem('accessToken') ?? '';
    setLoading(true);
    try {
      const { url } = await apiCreateCheckout(token, 'PRO');
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: '#FFFFFF' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 transition-colors"
          style={{ color: '#888780' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5F5F3'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Icon */}
        <div
          className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ background: '#E6F1FB' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#185FA5" />
          </svg>
        </div>

        {/* Content */}
        <h2 className="mb-1 text-[17px] font-semibold" style={{ color: '#1a1a18' }}>
          {title ?? 'Passez au plan Pro'}
        </h2>
        <p className="mb-5 text-[13px]" style={{ color: '#6B6868' }}>
          {description ?? 'Débloquez toutes les fonctionnalités pour gérer votre activité sans limites.'}
        </p>

        {/* Features */}
        <ul className="mb-6 space-y-2">
          {PRO_FEATURES.map(f => (
            <li key={f} className="flex items-center gap-2.5 text-[13px]" style={{ color: '#1a1a18' }}>
              <span
                className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: '#E6F1FB' }}
              >
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="#185FA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full rounded-xl py-2.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: '#185FA5' }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#14508a'; }}
          onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#185FA5'; }}
        >
          {loading ? 'Redirection…' : 'Passer au plan Pro — 9 €/mois'}
        </button>

        <p className="mt-3 text-center text-[11px]" style={{ color: '#888780' }}>
          Sans engagement · Annulable à tout moment
        </p>
      </div>
    </div>
  );
}
