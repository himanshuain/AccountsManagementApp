export default function SuppliersLoading() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-28 animate-pulse rounded bg-muted" />
          <div className="h-4 w-52 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded bg-muted" />
      </div>

      {/* Search skeleton */}
      <div className="h-10 w-full max-w-md animate-pulse rounded bg-muted" />

      {/* Cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
