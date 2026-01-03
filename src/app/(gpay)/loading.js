export default function GPayLoading() {
  return (
    <div className="bg-gpay-black min-h-screen">
      {/* Search Bar Skeleton */}
      <div className="px-4 py-3">
        <div className="bg-gpay-surface h-12 animate-pulse rounded-full" />
      </div>

      {/* People Section Skeleton */}
      <div className="px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="bg-gpay-surface h-5 w-16 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-2">
              <div className="bg-gpay-surface h-14 w-14 animate-pulse rounded-full" />
              <div className="bg-gpay-surface h-3 w-12 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Transactions Skeleton */}
      <div className="mt-4">
        <div className="border-gpay-border/50 flex items-center justify-between border-b px-4 py-3">
          <div className="bg-gpay-surface h-4 w-24 animate-pulse rounded" />
          <div className="bg-gpay-surface h-4 w-16 animate-pulse rounded" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="bg-gpay-surface h-12 w-12 animate-pulse rounded-full" />
            <div className="flex-1">
              <div className="bg-gpay-surface mb-2 h-4 w-32 animate-pulse rounded" />
              <div className="bg-gpay-surface h-3 w-24 animate-pulse rounded" />
            </div>
            <div className="bg-gpay-surface h-4 w-16 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
