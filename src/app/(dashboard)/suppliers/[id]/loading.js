export default function SupplierDetailLoading() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 animate-pulse rounded bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-8 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-10 animate-pulse rounded bg-muted" />
          <div className="h-10 w-10 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* Profile card skeleton */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="h-24 w-24 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
            <div className="h-px bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="grid gap-2 sm:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 text-center">
            <div className="mx-auto h-8 w-16 animate-pulse rounded bg-muted" />
            <div className="mx-auto mt-2 h-3 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Transactions skeleton */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b p-6">
          <div className="h-6 w-28 animate-pulse rounded bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-3 p-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
