export default function GPayLoading() {
  return (
    <div className="min-h-screen bg-gpay-black">
      {/* Search Bar Skeleton */}
      <div className="px-4 py-3">
        <div className="h-12 bg-gpay-surface rounded-full animate-pulse" />
      </div>

      {/* People Section Skeleton */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-16 bg-gpay-surface rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-2">
              <div className="h-14 w-14 rounded-full bg-gpay-surface animate-pulse" />
              <div className="h-3 w-12 rounded bg-gpay-surface animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Transactions Skeleton */}
      <div className="mt-4">
        <div className="px-4 py-3 flex items-center justify-between border-b border-gpay-border/50">
          <div className="h-4 w-24 bg-gpay-surface rounded animate-pulse" />
          <div className="h-4 w-16 bg-gpay-surface rounded animate-pulse" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-12 w-12 rounded-full bg-gpay-surface animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-32 bg-gpay-surface rounded animate-pulse mb-2" />
              <div className="h-3 w-24 bg-gpay-surface rounded animate-pulse" />
            </div>
            <div className="h-4 w-16 bg-gpay-surface rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}




