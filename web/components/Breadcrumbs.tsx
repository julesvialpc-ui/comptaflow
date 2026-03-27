import Link from 'next/link';

interface Crumb { label: string; href?: string; }

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-[12px] mb-4" aria-label="Fil d'Ariane">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span style={{ color: '#C8C6C2' }}>/</span>}
          {c.href ? (
            <Link href={c.href} className="transition-colors hover:underline" style={{ color: '#888780' }}>
              {c.label}
            </Link>
          ) : (
            <span className="font-medium" style={{ color: '#1a1a18' }}>{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
