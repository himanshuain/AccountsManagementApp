export default function HistoryLoading() {
  return (
    <div className="bg-gpay-black min-h-screen">
      {/* Search Bar Skeleton */}
      <div className="px-4 py-3">
        <div className="bg-gpay-surface h-12 animate-pulse rounded-full" />
      </div>

      {/* Stats Skeleton */}
      <div className="border-gpay-border/50 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="bg-gpay-surface h-4 w-24 animate-pulse rounded" />
          <div className="flex gap-3">
            <div className="bg-gpay-surface h-4 w-16 animate-pulse rounded" />
            <div className="bg-gpay-surface h-4 w-16 animate-pulse rounded" />
          </div>
        </div>
      </div>

      {/* Transaction Groups Skeleton */}
      {[...Array(2)].map((_, groupIndex) => (
        <div key={groupIndex}>
          <div className="border-gpay-border/50 flex items-center justify-between border-b px-4 py-3">
            <div className="bg-gpay-surface h-4 w-28 animate-pulse rounded" />
            <div className="bg-gpay-surface h-4 w-16 animate-pulse rounded" />
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="bg-gpay-surface h-12 w-12 animate-pulse rounded-full" />
              <div className="flex-1">
                <div className="bg-gpay-surface mb-2 h-4 w-32 animate-pulse rounded" />
                <div className="bg-gpay-surface h-3 w-40 animate-pulse rounded" />
              </div>
              <div className="bg-gpay-surface h-4 w-16 animate-pulse rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
