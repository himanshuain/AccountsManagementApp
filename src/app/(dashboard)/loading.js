import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
          <div className="h-10 w-36 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
              <div className="space-y-2">
                <div className="h-6 w-16 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border bg-card p-6">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-lg border bg-card p-6">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
