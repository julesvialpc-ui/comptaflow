'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_MAIN = [
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
    href: '/clients',
    label: 'Clients',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M3 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
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
    href: '/tax-reports',
    label: 'Rapports fiscaux',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 13 L6 7 L10 10 L14 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

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

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-[#E5E4E0]">
        <span className="text-[20px] font-medium tracking-tight">
          <span style={{ color: '#185FA5' }}>Compta</span><span style={{ color: '#378ADD' }}>Flow</span>
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#888780' }}>
          Navigation
        </p>
        {NAV_MAIN.map((item) => {
          const active = isActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors"
              style={active
                ? { background: '#E6F1FB', color: '#185FA5' }
                : { color: '#6B6868' }
              }
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F5F5F3'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = ''; }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {/* AI section */}
        <div className="pt-3 pb-1">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#888780' }}>
            Intelligence artificielle
          </p>
          <Link
            href={NAV_AI.href}
            onClick={onNavClick}
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors"
            style={isActive(NAV_AI.href, pathname)
              ? { background: '#E6F1FB', color: '#185FA5' }
              : { color: '#6B6868' }
            }
            onMouseEnter={e => { if (!isActive(NAV_AI.href, pathname)) (e.currentTarget as HTMLElement).style.background = '#F5F5F3'; }}
            onMouseLeave={e => { if (!isActive(NAV_AI.href, pathname)) (e.currentTarget as HTMLElement).style.background = ''; }}
          >
            <span style={isActive(NAV_AI.href, pathname) ? { color: '#185FA5' } : { color: '#378ADD' }}>
              {NAV_AI.icon}
            </span>
            {NAV_AI.label}
            <span
              className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: '#E6F1FB', color: '#185FA5' }}
            >
              IA
            </span>
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

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
            <span style={{ color: '#185FA5' }}>Compta</span><span style={{ color: '#378ADD' }}>Flow</span>
          </span>
          <div className="w-9" />
        </div>

        <main>{children}</main>
      </div>
    </div>
  );
}
