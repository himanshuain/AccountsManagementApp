export default function PersonChatLoading() {
  return (
    <div className="bg-gpay-black flex min-h-screen flex-col">
      {/* Header Skeleton */}
      <header className="bg-gpay-black border-gpay-border/50 sticky top-0 z-30 border-b">
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-2">
            <div className="bg-gpay-surface h-10 w-10 animate-pulse rounded-full" />
            <div className="flex items-center gap-3">
              <div className="bg-gpay-surface h-12 w-12 animate-pulse rounded-full" />
              <div>
                <div className="bg-gpay-surface mb-1 h-4 w-28 animate-pulse rounded" />
                <div className="bg-gpay-surface h-3 w-20 animate-pulse rounded" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="bg-gpay-surface h-10 w-10 animate-pulse rounded-full" />
            <div className="bg-gpay-surface h-10 w-10 animate-pulse rounded-full" />
          </div>
        </div>

        {/* Progress Bar Skeleton */}
        <div className="px-4 pb-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="bg-gpay-surface h-3 w-24 animate-pulse rounded" />
            <div className="bg-gpay-surface h-3 w-20 animate-pulse rounded" />
          </div>
          <div className="bg-gpay-surface h-1.5 overflow-hidden rounded-full">
            <div className="bg-gpay-surface-elevated h-full w-1/2 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Chat Messages Skeleton */}
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        {/* Date Separator */}
        <div className="flex items-center justify-center">
          <div className="bg-gpay-surface h-6 w-24 animate-pulse rounded-full" />
        </div>

        {/* Message Bubbles */}
        <div className="space-y-3">
          <div className="flex justify-end">
            <div className="bg-gpay-surface-elevated h-24 w-48 animate-pulse rounded-2xl rounded-br-sm" />
          </div>
          <div className="flex justify-end">
            <div className="bg-gpay-surface-elevated h-20 w-56 animate-pulse rounded-2xl rounded-br-sm" />
          </div>
          <div className="flex justify-end">
            <div className="bg-gpay-surface-elevated h-16 w-40 animate-pulse rounded-2xl rounded-br-sm" />
          </div>
        </div>

        {/* Another Date */}
        <div className="flex items-center justify-center">
          <div className="bg-gpay-surface h-6 w-24 animate-pulse rounded-full" />
        </div>

        <div className="space-y-3">
          <div className="flex justify-end">
            <div className="bg-gpay-surface-elevated h-24 w-52 animate-pulse rounded-2xl rounded-br-sm" />
          </div>
        </div>
      </div>

      {/* Bottom Action Bar Skeleton */}
      <div className="bg-gpay-black border-gpay-border/50 safe-area-bottom sticky bottom-0 border-t p-3">
        <div className="flex items-center gap-2">
          <div className="bg-gpay-surface h-12 w-20 animate-pulse rounded-full" />
          <div className="bg-gpay-surface h-12 w-28 animate-pulse rounded-full" />
          <div className="bg-gpay-surface ml-auto h-12 w-12 animate-pulse rounded-full" />
        </div>
      </div>
    </div>
  );
}
