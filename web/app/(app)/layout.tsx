'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { AppNotification } from '@/lib/types';
import { getActivePlan } from '@/lib/auth';
import { apiGetNotifications, apiMarkNotificationRead, apiMarkAllNotificationsRead } from '@/lib/notifications';
import { apiGetBusiness } from '@/lib/settings';
import UpgradeModal from '@/components/UpgradeModal';
import SearchModal from '@/components/SearchModal';

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_ACTIVITE = [
  {
    href: '/invoices',
    label: 'Factures',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
        <line x1="5" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.2" />
        <line x1="5" y1="9" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    href: '/quotes',
    label: 'Devis',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/clients',
    label: 'Clients',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M3 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
];

const NAV_FINANCE = [
  {
    href: '/revenues',
    label: 'Revenus',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 13V3M4 7l4-4 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="2" y="11" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    href: '/expenses',
    label: 'Dépenses',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <line x1="1" y1="7" x2="15" y2="7" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    href: '/time-tracking',
    label: 'Temps',
    pro: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const NAV_PILOTAGE = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7" />
      </svg>
    ),
  },
  {
    href: '/tax-reports',
    label: 'Rapports fiscaux',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 13 L6 7 L10 10 L14 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const NAV_EMPLOYEES = {
  href: '/employees',
  label: 'Mes employés',
  icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="5.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="10.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 13c0-2.21 2.015-4 4.5-4s4.5 1.79 4.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11 9.2c1.5.4 2.7 1.8 2.7 3.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
};

const NAV_SETTINGS = {
  href: '/settings',
  label: 'Paramètres',
  icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
};

const NAV_AI = {
  href: '/chat',
  label: 'Assistant IA',
  icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 14l1.5-2h3L11 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="5" cy="7" r="1" fill="currentColor" />
      <circle cx="8" cy="7" r="1" fill="currentColor" />
      <circle cx="11" cy="7" r="1" fill="currentColor" />
    </svg>
  ),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isActive(href: string, pathname: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(href);
}

function initials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

// ─── Sidebar content ──────────────────────────────────────────────────────────

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'à l’instant';
  if (mins < 60) return `il y a ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `il y a ${days}j`;
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [hasEmployees, setHasEmployees] = useState(false);
  const plan = getActivePlan(user);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!t) return;
    apiGetNotifications(t).then(setNotifications).catch(() => {});
    apiGetBusiness(t).then((b) => { if (b?.hasEmployees) setHasEmployees(true); }).catch(() => {});
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  async function handleMarkRead(id: string) {
    const t = localStorage.getItem('accessToken') ?? '';
    await apiMarkNotificationRead(t, id).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }

  async function handleMarkAllRead() {
    const t = localStorage.getItem('accessToken') ?? '';
    await apiMarkAllNotificationsRead(t).catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-[#E5E4E0]">
        <Link href="/dashboard" onClick={onNavClick} className="text-[20px] font-medium tracking-tight">
          <span style={{ color: '#185FA5' }}>Ko</span><span style={{ color: '#378ADD' }}>nta</span>
        </Link>
      </div>

      {/* Search bar */}
      <div className="px-2 pt-2 pb-1">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-search'))}
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-left transition-colors"
          style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#888780' }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span className="flex-1">Rechercher…</span>
          <kbd className="hidden sm:inline text-[10px] rounded px-1.5 py-0.5" style={{ background: '#EDEDEB', color: '#888780' }}>⌘K</kbd>
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">

        {/* Activité */}
        <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#888780' }}>Activité</p>
        {NAV_ACTIVITE.map((item) => {
          const active = isActive(item.href, pathname);
          return (
            <Link key={item.href} href={item.href} onClick={onNavClick}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors"
              style={active ? { background: '#E6F1FB', color: '#185FA5' } : { color: '#6B6868' }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F5F5F3'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = ''; }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {/* Finance */}
        <p className="px-3 pt-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#888780' }}>Finance</p>
        {NAV_FINANCE.map((item) => {
          const active = isActive(item.href, pathname);
          const isProLocked = (item as any).pro && plan === 'FREE';
          return (
            <Link key={item.href} href={item.href} onClick={onNavClick}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors"
              style={active ? { background: '#E6F1FB', color: '#185FA5' } : { color: '#6B6868' }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F5F5F3'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = ''; }}
            >
              <span>{item.icon}</span>
              {item.label}
              {isProLocked && (
                <span className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: '#E6F1FB', color: '#185FA5' }}>PRO</span>
              )}
            </Link>
          );
        })}

        {/* Pilotage */}
        <p className="px-3 pt-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#888780' }}>Pilotage</p>
        {NAV_PILOTAGE.map((item) => {
          const active = isActive(item.href, pathname);
          return (
            <Link key={item.href} href={item.href} onClick={onNavClick}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors"
              style={active ? { background: '#E6F1FB', color: '#185FA5' } : { color: '#6B6868' }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F5F5F3'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = ''; }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        {hasEmployees && (
          <Link href={NAV_EMPLOYEES.href} onClick={onNavClick}
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors"
            style={isActive(NAV_EMPLOYEES.href, pathname) ? { background: '#E6F1FB', color: '#185FA5' } : { color: '#6B6868' }}
            onMouseEnter={e => { if (!isActive(NAV_EMPLOYEES.href, pathname)) (e.currentTarget as HTMLElement).style.background = '#F5F5F3'; }}
            onMouseLeave={e => { if (!isActive(NAV_EMPLOYEES.href, pathname)) (e.currentTarget as HTMLElement).style.background = ''; }}
          >
            <span>{NAV_EMPLOYEES.icon}</span>
            {NAV_EMPLOYEES.label}
          </Link>
        )}

        {/* Assistant IA */}
        <div className="pt-3">
          <Link href={NAV_AI.href} onClick={onNavClick}
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors"
            style={isActive(NAV_AI.href, pathname)
              ? { background: '#E6F1FB', color: '#185FA5' }
              : { background: '#F5F5F3', color: '#378ADD' }
            }
            onMouseEnter={e => { if (!isActive(NAV_AI.href, pathname)) (e.currentTarget as HTMLElement).style.background = '#EBF4FF'; }}
            onMouseLeave={e => { if (!isActive(NAV_AI.href, pathname)) (e.currentTarget as HTMLElement).style.background = '#F5F5F3'; }}
          >
            <span style={{ color: isActive(NAV_AI.href, pathname) ? '#185FA5' : '#378ADD' }}>{NAV_AI.icon}</span>
            <span className="font-semibold">{NAV_AI.label}</span>
            {plan === 'FREE' ? (
              <span className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: '#E6F1FB', color: '#185FA5' }}>PRO</span>
            ) : (
              <span className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: '#E6F1FB', color: '#185FA5' }}>IA</span>
            )}
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-[#E5E4E0] px-2 py-3">
        <Link
          href={NAV_SETTINGS.href}
          onClick={onNavClick}
          className="flex items-center gap-2.5 rounded-md px-3 py-2 mb-1 text-[13px] font-medium transition-colors"
          style={isActive(NAV_SETTINGS.href, pathname)
            ? { background: '#E6F1FB', color: '#185FA5' }
            : { color: '#6B6868' }
          }
          onMouseEnter={e => { if (!isActive(NAV_SETTINGS.href, pathname)) (e.currentTarget as HTMLElement).style.background = '#F5F5F3'; }}
          onMouseLeave={e => { if (!isActive(NAV_SETTINGS.href, pathname)) (e.currentTarget as HTMLElement).style.background = ''; }}
        >
          <span>{NAV_SETTINGS.icon}</span>
          {NAV_SETTINGS.label}
        </Link>

        {/* Plan badge */}
        {plan === 'FREE' && (
          <div
            className="mx-1 mb-2 rounded-lg px-3 py-2.5"
            style={{ background: '#F0F7FF', border: '0.5px solid #C8DCF2' }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium" style={{ color: '#6B6868' }}>Plan actuel</span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: '#E5E4E0', color: '#6B6868' }}
              >
                GRATUIT
              </span>
            </div>
            <button
              onClick={() => setShowUpgrade(true)}
              className="w-full rounded-lg py-1.5 text-[12px] font-semibold text-white transition-opacity"
              style={{ background: '#185FA5' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#14508a'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#185FA5'; }}
            >
              Passer au Pro ✦
            </button>
          </div>
        )}
        {plan !== 'FREE' && (
          <div className="mx-1 mb-2 flex items-center justify-between rounded-lg px-3 py-2" style={{ background: '#F0F7FF' }}>
            <span className="text-[12px] font-medium" style={{ color: '#185FA5' }}>Plan {plan}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#185FA5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
        )}

        {/* Notification bell + Dark mode toggle */}
        <div className="flex items-center gap-1 px-3 py-1.5 mb-1">
          <div className="relative">
            <button
              onClick={() => setShowNotifs(v => !v)}
              className="rounded-md p-1.5 transition-colors"
              style={{ color: '#888780' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5F5F3'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
              title="Notifications"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white"
                  style={{ background: '#DC2626' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {showNotifs && (
              <div
                className="absolute bottom-full left-0 mb-1 w-72 rounded-lg shadow-lg z-50"
                style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}
              >
                <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '0.5px solid #E5E4E0' }}>
                  <span className="text-[12px] font-medium" style={{ color: '#1a1a18' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-[11px] font-medium" style={{ color: '#378ADD' }}>
                      Tout lire
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-3 py-4 text-center text-[12px]" style={{ color: '#888780' }}>Aucune notification</p>
                  ) : (
                    notifications.slice(0, 5).map(n => (
                      <button
                        key={n.id}
                        onClick={() => {
                          handleMarkRead(n.id);
                          if (n.link) { setShowNotifs(false); window.location.href = n.link; }
                        }}
                        className="w-full text-left px-3 py-2.5 transition-colors hover:bg-zinc-50"
                        style={{ borderBottom: '0.5px solid #F0F0EE' }}
                      >
                        <div className="flex items-start gap-2">
                          {!n.isRead && (
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: '#378ADD' }} />
                          )}
                          <div className={!n.isRead ? '' : 'ml-3.5'}>
                            <p className="text-[12px] font-medium" style={{ color: '#1a1a18' }}>{n.title}</p>
                            <p className="text-[11px]" style={{ color: '#888780' }}>{n.message}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: '#888780' }}>{relativeTime(n.createdAt)}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="rounded-md p-1.5 transition-colors"
            style={{ color: '#888780' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5F5F3'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
            title={theme === 'light' ? 'Mode sombre' : 'Mode clair'}
          >
            {theme === 'light' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
        </div>

        <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />

        <div className="flex items-center gap-2.5 px-3 py-2">
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
            style={{ background: '#378ADD' }}
          >
            {user ? initials(user.name, user.email) : '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium" style={{ color: '#1a1a18' }}>
              {user?.name ?? user?.email ?? 'Utilisateur'}
            </p>
            {user?.name && (
              <p className="truncate text-[11px]" style={{ color: '#888780' }}>{user.email}</p>
            )}
          </div>
          <button
            onClick={logout}
            title="Déconnexion"
            className="flex-shrink-0 rounded-md p-1.5 transition-colors"
            style={{ color: '#888780' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5F5F3'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M10 10l3-3m0 0l-3-3m3 3H5m3 4v1a2.5 2.5 0 01-2.5 2.5H4A2.5 2.5 0 011.5 11.5v-8A2.5 2.5 0 014 1h1.5A2.5 2.5 0 018 3.5v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Add Button ─────────────────────────────────────────────────────────

function QuickAddButton({ onNavClick }: { onNavClick?: () => void }) {
  const [open, setOpen] = useState(false);

  const actions = [
    {
      href: '/invoices/new',
      label: 'Nouvelle facture',
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
          <line x1="5" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.2" />
          <line x1="5" y1="9" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      ),
    },
    {
      href: '/quotes/new',
      label: 'Nouveau devis',
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      href: '/expenses',
      label: 'Nouvelle dépense',
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
          <line x1="1" y1="7" x2="15" y2="7" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      ),
    },
    {
      href: '/revenues',
      label: 'Nouveau revenu',
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 13V3M4 7l4-4 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {/* Actions */}
      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="relative flex flex-col items-end gap-1.5 mb-1">
            {actions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                onClick={() => { setOpen(false); onNavClick?.(); }}
                className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-[13px] font-medium shadow-lg transition-transform hover:scale-105"
                style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
              >
                <span style={{ color: '#378ADD' }}>{a.icon}</span>
                {a.label}
              </Link>
            ))}
          </div>
        </>
      )}
      {/* Toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all"
        style={{ background: '#185FA5' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#14508a'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#185FA5'; }}
      >
        <svg
          width="20" height="20" viewBox="0 0 20 20" fill="none"
          style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <path d="M10 4v12M4 10h12" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Raccourcis clavier globaux
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
    }
    function onSearchEvent() { setSearchOpen(true); }
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-search', onSearchEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-search', onSearchEvent);
    };
  }, [router]);

  const pathname = usePathname();
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  useEffect(() => {
    if (!isLoading && !user) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#F5F5F3' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: '#378ADD', borderTopColor: 'transparent' }} />
          <p className="text-[13px]" style={{ color: '#888780' }}>Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#F5F5F3' }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-52 lg:flex-col"
        style={{ background: '#FFFFFF', borderRight: '0.5px solid #E5E4E0' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.3)' }}
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className="absolute inset-y-0 left-0 w-52"
            style={{ background: '#FFFFFF', borderRight: '0.5px solid #E5E4E0' }}
          >
            <SidebarContent onNavClick={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:pl-52">
        {/* Mobile top bar */}
        <div
          className="sticky top-0 z-30 flex h-14 items-center justify-between px-4 lg:hidden"
          style={{ background: '#FFFFFF', borderBottom: '0.5px solid #E5E4E0' }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-md p-2 transition-colors"
            style={{ color: '#888780' }}
            aria-label="Ouvrir le menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-[17px] font-medium tracking-tight">
            <span style={{ color: '#185FA5' }}>Ko</span><span style={{ color: '#378ADD' }}>nta</span>
          </span>
          <div className="w-9" />
        </div>

        <main>{children}</main>
      </div>

      <QuickAddButton />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
