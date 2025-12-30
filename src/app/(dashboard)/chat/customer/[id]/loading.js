export default function Loading() {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header skeleton */}
      <div className="flex items-center gap-2 px-2 py-2 border-b">
        <div className="h-10 w-10 rounded-full skeleton-shimmer" />
        <div className="h-12 w-12 rounded-full skeleton-shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 skeleton-shimmer rounded" />
          <div className="h-3 w-24 skeleton-shimmer rounded" />
        </div>
      </div>

      {/* Progress skeleton */}
      <div className="p-4 border-b">
        <div className="h-3 w-24 skeleton-shimmer rounded mb-2" />
        <div className="h-8 w-28 skeleton-shimmer rounded mb-3" />
        <div className="h-2 w-full skeleton-shimmer rounded-full mb-3" />
        <div className="flex justify-between">
          <div className="h-4 w-20 skeleton-shimmer rounded" />
          <div className="h-4 w-20 skeleton-shimmer rounded" />
        </div>
      </div>

      {/* Chat area skeleton */}
      <div className="flex-1 p-4 space-y-4">
        {/* Date separator */}
        <div className="flex items-center gap-3 py-4">
          <div className="flex-1 h-px bg-border" />
          <div className="h-4 w-16 skeleton-shimmer rounded" />
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Bubble right */}
        <div className="flex justify-end">
          <div className="w-[70%] h-24 skeleton-shimmer rounded-2xl rounded-tr-sm" />
        </div>

        {/* Bubble left */}
        <div className="flex justify-start">
          <div className="w-[60%] h-20 skeleton-shimmer rounded-2xl rounded-tl-sm" />
        </div>

        {/* Bubble right */}
        <div className="flex justify-end">
          <div className="w-[65%] h-28 skeleton-shimmer rounded-2xl rounded-tr-sm" />
        </div>
      </div>

      {/* Action bar skeleton */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <div className="h-10 w-24 skeleton-shimmer rounded-full" />
          <div className="h-10 flex-1 skeleton-shimmer rounded-full" />
        </div>
      </div>
    </div>
  );
}




