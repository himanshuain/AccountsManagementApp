export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-gpay-black">
      {/* Header Skeleton */}
      <div className="px-4 py-4 border-b border-gpay-border/50">
        <div className="h-6 w-24 bg-gpay-surface rounded animate-pulse" />
      </div>

      {/* Menu Sections Skeleton */}
      <div className="px-4 py-4 space-y-6">
        {[...Array(3)].map((_, sectionIndex) => (
          <div key={sectionIndex}>
            <div className="h-3 w-16 bg-gpay-surface rounded animate-pulse mb-2 ml-1" />
            <div className="bg-gpay-surface rounded-xl overflow-hidden divide-y divide-gpay-border/30">
              {[...Array(sectionIndex === 0 ? 3 : 2)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <div className="h-10 w-10 rounded-full bg-gpay-surface-elevated animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-28 bg-gpay-surface-elevated rounded animate-pulse mb-1" />
                    <div className="h-3 w-36 bg-gpay-surface-elevated rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-5 bg-gpay-surface-elevated rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}




