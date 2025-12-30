export default function HistoryLoading() {
  return (
    <div className="min-h-screen bg-gpay-black">
      {/* Search Bar Skeleton */}
      <div className="px-4 py-3">
        <div className="h-12 bg-gpay-surface rounded-full animate-pulse" />
      </div>

      {/* Stats Skeleton */}
      <div className="px-4 py-3 border-b border-gpay-border/50">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 bg-gpay-surface rounded animate-pulse" />
          <div className="flex gap-3">
            <div className="h-4 w-16 bg-gpay-surface rounded animate-pulse" />
            <div className="h-4 w-16 bg-gpay-surface rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Transaction Groups Skeleton */}
      {[...Array(2)].map((_, groupIndex) => (
        <div key={groupIndex}>
          <div className="px-4 py-3 flex items-center justify-between border-b border-gpay-border/50">
            <div className="h-4 w-28 bg-gpay-surface rounded animate-pulse" />
            <div className="h-4 w-16 bg-gpay-surface rounded animate-pulse" />
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-12 w-12 rounded-full bg-gpay-surface animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-gpay-surface rounded animate-pulse mb-2" />
                <div className="h-3 w-40 bg-gpay-surface rounded animate-pulse" />
              </div>
              <div className="h-4 w-16 bg-gpay-surface rounded animate-pulse" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}




