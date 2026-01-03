export default function Loading() {
  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header skeleton */}
      <div className="flex items-center gap-2 border-b px-2 py-2">
        <div className="skeleton-shimmer h-10 w-10 rounded-full" />
        <div className="skeleton-shimmer h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton-shimmer h-4 w-32 rounded" />
          <div className="skeleton-shimmer h-3 w-24 rounded" />
        </div>
      </div>

      {/* Progress skeleton */}
      <div className="border-b p-4">
        <div className="skeleton-shimmer mb-2 h-3 w-24 rounded" />
        <div className="skeleton-shimmer mb-3 h-8 w-28 rounded" />
        <div className="skeleton-shimmer mb-3 h-2 w-full rounded-full" />
        <div className="flex justify-between">
          <div className="skeleton-shimmer h-4 w-20 rounded" />
          <div className="skeleton-shimmer h-4 w-20 rounded" />
        </div>
      </div>

      {/* Chat area skeleton */}
      <div className="flex-1 space-y-4 p-4">
        {/* Date separator */}
        <div className="flex items-center gap-3 py-4">
          <div className="h-px flex-1 bg-border" />
          <div className="skeleton-shimmer h-4 w-16 rounded" />
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Bubble right */}
        <div className="flex justify-end">
          <div className="skeleton-shimmer h-24 w-[70%] rounded-2xl rounded-tr-sm" />
        </div>

        {/* Bubble left */}
        <div className="flex justify-start">
          <div className="skeleton-shimmer h-20 w-[60%] rounded-2xl rounded-tl-sm" />
        </div>

        {/* Bubble right */}
        <div className="flex justify-end">
          <div className="skeleton-shimmer h-28 w-[65%] rounded-2xl rounded-tr-sm" />
        </div>
      </div>

      {/* Action bar skeleton */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <div className="skeleton-shimmer h-10 w-24 rounded-full" />
          <div className="skeleton-shimmer h-10 flex-1 rounded-full" />
        </div>
      </div>
    </div>
  );
}
