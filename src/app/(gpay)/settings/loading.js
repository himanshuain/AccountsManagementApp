export default function SettingsLoading() {
  return (
    <div className="bg-gpay-black min-h-screen">
      {/* Header Skeleton */}
      <div className="border-gpay-border/50 border-b px-4 py-4">
        <div className="bg-gpay-surface h-6 w-24 animate-pulse rounded" />
      </div>

      {/* Menu Sections Skeleton */}
      <div className="space-y-6 px-4 py-4">
        {[...Array(3)].map((_, sectionIndex) => (
          <div key={sectionIndex}>
            <div className="bg-gpay-surface mb-2 ml-1 h-3 w-16 animate-pulse rounded" />
            <div className="bg-gpay-surface divide-gpay-border/30 divide-y overflow-hidden rounded-xl">
              {[...Array(sectionIndex === 0 ? 3 : 2)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <div className="bg-gpay-surface-elevated h-10 w-10 animate-pulse rounded-full" />
                  <div className="flex-1">
                    <div className="bg-gpay-surface-elevated mb-1 h-4 w-28 animate-pulse rounded" />
                    <div className="bg-gpay-surface-elevated h-3 w-36 animate-pulse rounded" />
                  </div>
                  <div className="bg-gpay-surface-elevated h-5 w-5 animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
