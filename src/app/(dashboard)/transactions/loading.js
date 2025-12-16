export default function TransactionsLoading() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-36 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-36 animate-pulse rounded bg-muted" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 text-center">
            <div className="mx-auto h-8 w-24 animate-pulse rounded bg-muted" />
            <div className="mx-auto mt-2 h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-wrap gap-3">
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        <div className="h-10 w-[140px] animate-pulse rounded bg-muted" />
        <div className="h-10 w-[180px] animate-pulse rounded bg-muted" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-6">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="p-4">
          <div className="space-y-4">
            {/* Table header */}
            <div className="flex gap-4 border-b pb-2">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
            {/* Table rows */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-32 flex-1 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
