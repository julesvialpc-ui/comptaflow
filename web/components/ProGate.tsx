'use client';

import { useState } from 'react';
import UpgradeModal from './UpgradeModal';

interface Props {
  feature: string;
  description: string;
  children: React.ReactNode;
  isLocked: boolean;
}

export default function ProGate({ feature, description, children, isLocked }: Props) {
  const [showModal, setShowModal] = useState(false);

  if (!isLocked) return <>{children}</>;

  return (
    <div className="relative min-h-[60vh]">
      {/* Blurred content preview */}
      <div className="pointer-events-none select-none blur-sm opacity-40">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="mx-4 w-full max-w-sm rounded-2xl p-8 text-center shadow-xl"
          style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}
        >
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: '#E6F1FB' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="#185FA5" strokeWidth="1.5" />
              <path d="M8 11V7a4 4 0 018 0v4" stroke="#185FA5" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          <span
            className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ background: '#E6F1FB', color: '#185FA5' }}
          >
            Plan Pro requis
          </span>

          <h2 className="mb-2 text-[17px] font-semibold" style={{ color: '#1a1a18' }}>
            {feature}
          </h2>
          <p className="mb-6 text-[13px]" style={{ color: '#6B6868' }}>
            {description}
          </p>

          <button
            onClick={() => setShowModal(true)}
            className="w-full rounded-xl py-2.5 text-[14px] font-semibold text-white"
            style={{ background: '#185FA5' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#14508a'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#185FA5'; }}
          >
            Débloquer — 9 €/mois
          </button>

          <p className="mt-2 text-[11px]" style={{ color: '#888780' }}>
            Sans engagement · Annulable à tout moment
          </p>
        </div>
      </div>

      <UpgradeModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
