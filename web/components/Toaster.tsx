'use client';

import { useToast, ToastType } from '@/contexts/ToastContext';

const COLORS: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: '#F0F9EC', border: '#D3EEC4', text: '#3B6D11', icon: '✓' },
  error:   { bg: '#FEF2F2', border: '#FECACA', text: '#A32D2D', icon: '✕' },
  warning: { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', icon: '!' },
  info:    { bg: '#E6F1FB', border: '#C8DCF2', text: '#185FA5', icon: 'i' },
};

export default function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => {
        const c = COLORS[t.type];
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-[13px] font-medium"
            style={{ background: c.bg, border: `0.5px solid ${c.border}`, color: c.text, minWidth: 240, maxWidth: 380 }}
          >
            <span
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
              style={{ background: c.border, color: c.text }}
            >
              {c.icon}
            </span>
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: c.text }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
