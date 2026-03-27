export function Skeleton({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className}`}
      style={{ background: '#EDEDEB', ...style }}
    />
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
      <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-2.5 w-32" />
      </div>
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  );
}
