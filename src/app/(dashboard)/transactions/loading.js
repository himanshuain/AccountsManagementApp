export default function TransactionsLoading() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-36 bg-muted rounded animate-pulse" />
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-10 w-36 bg-muted rounded animate-pulse" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 text-center">
            <div className="h-8 w-24 mx-auto bg-muted rounded animate-pulse" />
            <div className="h-3 w-16 mx-auto mt-2 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-wrap gap-3">
        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        <div className="h-10 w-[140px] bg-muted rounded animate-pulse" />
        <div className="h-10 w-[180px] bg-muted rounded animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border bg-card">
        <div className="p-6 border-b">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="p-4">
          <div className="space-y-4">
            {/* Table header */}
            <div className="flex gap-4 pb-2 border-b">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse flex-1" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            </div>
            {/* Table rows */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 py-3 items-center">
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                <div className="h-4 w-32 bg-muted rounded animate-pulse flex-1" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
