'use client';

export interface MobileAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export function MobileActionSheet({
  open,
  onClose,
  title,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  actions: MobileAction[];
}) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
      <div
        className="fixed inset-x-0 bottom-0 z-[60] rounded-t-2xl bg-white bottom-nav-safe"
        style={{ boxShadow: '0 -4px 32px rgba(0,0,0,0.10)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-zinc-200" />
        </div>

        {title && (
          <p className="px-5 pb-2 text-[12px] font-medium uppercase tracking-widest" style={{ color: '#888780' }}>
            {title}
          </p>
        )}

        <div className="px-3 pb-2">
          {actions.map((action, i) => (
            <button
              key={i}
              disabled={action.disabled}
              onClick={() => { if (!action.disabled) { action.onClick(); onClose(); } }}
              className="flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-left transition-colors active:bg-zinc-50 disabled:opacity-40"
              style={{ color: action.variant === 'danger' ? '#DC2626' : '#1a1a18' }}
            >
              {action.icon && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: action.variant === 'danger' ? '#FEF2F2' : '#F5F5F3', color: action.variant === 'danger' ? '#DC2626' : '#1a1a18' }}>
                  {action.icon}
                </span>
              )}
              <span className="text-[15px] font-medium">{action.label}</span>
            </button>
          ))}
        </div>

        <div className="px-3 pb-3">
          <button
            onClick={onClose}
            className="w-full rounded-xl py-3.5 text-center text-[15px] font-semibold transition-colors active:bg-zinc-50"
            style={{ background: '#F5F5F3', color: '#6B6868' }}
          >
            Annuler
          </button>
        </div>
      </div>
    </>
  );
}
