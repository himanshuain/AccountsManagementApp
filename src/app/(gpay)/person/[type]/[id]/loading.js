export default function PersonChatLoading() {
  return (
    <div className="min-h-screen bg-gpay-black flex flex-col">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-30 bg-gpay-black border-b border-gpay-border/50">
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-gpay-surface rounded-full animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gpay-surface animate-pulse" />
              <div>
                <div className="h-4 w-28 bg-gpay-surface rounded animate-pulse mb-1" />
                <div className="h-3 w-20 bg-gpay-surface rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-10 w-10 bg-gpay-surface rounded-full animate-pulse" />
            <div className="h-10 w-10 bg-gpay-surface rounded-full animate-pulse" />
          </div>
        </div>

        {/* Progress Bar Skeleton */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="h-3 w-24 bg-gpay-surface rounded animate-pulse" />
            <div className="h-3 w-20 bg-gpay-surface rounded animate-pulse" />
          </div>
          <div className="h-1.5 bg-gpay-surface rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-gpay-surface-elevated animate-pulse" />
          </div>
        </div>
      </header>

      {/* Chat Messages Skeleton */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Date Separator */}
        <div className="flex items-center justify-center">
          <div className="h-6 w-24 bg-gpay-surface rounded-full animate-pulse" />
        </div>

        {/* Message Bubbles */}
        <div className="space-y-3">
          <div className="flex justify-end">
            <div className="w-48 h-24 bg-gpay-surface-elevated rounded-2xl rounded-br-sm animate-pulse" />
          </div>
          <div className="flex justify-end">
            <div className="w-56 h-20 bg-gpay-surface-elevated rounded-2xl rounded-br-sm animate-pulse" />
          </div>
          <div className="flex justify-end">
            <div className="w-40 h-16 bg-gpay-surface-elevated rounded-2xl rounded-br-sm animate-pulse" />
          </div>
        </div>

        {/* Another Date */}
        <div className="flex items-center justify-center">
          <div className="h-6 w-24 bg-gpay-surface rounded-full animate-pulse" />
        </div>

        <div className="space-y-3">
          <div className="flex justify-end">
            <div className="w-52 h-24 bg-gpay-surface-elevated rounded-2xl rounded-br-sm animate-pulse" />
          </div>
        </div>
      </div>

      {/* Bottom Action Bar Skeleton */}
      <div className="sticky bottom-0 bg-gpay-black border-t border-gpay-border/50 p-3 safe-area-bottom">
        <div className="flex items-center gap-2">
          <div className="h-12 w-20 bg-gpay-surface rounded-full animate-pulse" />
          <div className="h-12 w-28 bg-gpay-surface rounded-full animate-pulse" />
          <div className="ml-auto h-12 w-12 bg-gpay-surface rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}





