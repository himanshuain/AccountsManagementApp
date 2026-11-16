import { cn } from "@/lib/utils";

/** Shimmer block — matches `.skeleton-hero` wave used on home */
export function Sk({ className, ...props }) {
  return <div className={cn("skeleton-hero", className)} {...props} aria-hidden />;
}

export function PersonListRowSkeleton({ className }) {
  return (
    <div className={cn("flex items-center gap-3 px-3 py-2.5", className)}>
      <Sk className="h-12 w-12 shrink-0 rounded-full" />
      <Sk className="h-3.5 max-w-[9rem] flex-1 rounded-md" />
      <Sk className="h-4 w-16 shrink-0 rounded-md" />
    </div>
  );
}

export function PersonListCardSkeleton({ rows = 4, className }) {
  return (
    <div
      className={cn(
        "divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/50 bg-card/50",
        className
      )}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <PersonListRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatCardSkeleton({ className }) {
  return (
    <div className={cn("stat-card", className)}>
      <Sk className="mb-1.5 h-4 w-4 rounded-md" />
      <Sk className="mb-1.5 h-3 w-14 rounded-md" />
      <Sk className="my-0.5 h-7 w-24 rounded-md" />
      <Sk className="mt-1 h-2.5 w-[4.5rem] rounded-md" />
    </div>
  );
}

export function SectionHeaderSkeleton({ className, withCount = true }) {
  return (
    <div className={cn("mb-2 flex w-full items-center justify-between gap-2", className)}>
      <div className="flex min-w-0 items-center gap-2">
        <Sk className="h-7 w-7 shrink-0 rounded-lg" />
        <Sk className="h-3.5 w-[5.5rem] rounded-md" />
        {withCount && <Sk className="h-4 w-7 rounded-full" />}
      </div>
      <Sk className="h-4 w-4 shrink-0 rounded-md" />
    </div>
  );
}

export function HomePageSkeleton({ className }) {
  return (
    <div className={cn("min-h-dvh bg-background lg:mx-auto lg:max-w-6xl xl:max-w-7xl", className)}>
      <div className="header-glass sticky top-0 z-20 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sk className="h-12 min-w-0 flex-1 rounded-xl" />
          <Sk className="h-12 w-12 shrink-0 rounded-xl" />
          <Sk className="h-12 w-12 shrink-0 rounded-xl" />
        </div>
      </div>

      <section className="px-4 pt-4 pb-1">
        <SectionHeaderSkeleton withCount={false} />
        <Sk className="mt-1 h-3 w-52 max-w-full rounded-md" />
      </section>

      <div className="px-4 pt-2 pb-2">
        <div className="grid grid-cols-2 gap-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </div>

      {[0, 1].map(section => (
        <section key={section} className={cn("px-4", section === 1 ? "mt-5 pb-24" : "mt-4")}>
          <SectionHeaderSkeleton />
          <PersonListCardSkeleton rows={4} />
        </section>
      ))}
    </div>
  );
}

function TransactionBubbleSkeleton({ withThumb = true }) {
  return (
    <div className="flex w-full justify-end">
      <div className="flex w-full max-w-md items-start gap-3.5">
        {withThumb && <Sk className="h-[104px] w-[84px] shrink-0 rounded-[10px]" />}
        <div className="min-w-0 flex-1 space-y-2.5 rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <Sk className="h-4 w-16 rounded-md" />
            <Sk className="h-4 w-20 rounded-md" />
          </div>
          <Sk className="h-3 w-full rounded-md" />
          <Sk className="h-3 max-w-[12rem] w-4/5 rounded-md" />
          <Sk className="mt-1 h-9 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function PersonProfileSkeleton({ className, isSupplier = true }) {
  return (
    <div className={cn("flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background", className)}>
      <header className="header-glass shrink-0 border-b border-black/[0.1] dark:border-white/[0.1]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Sk className="h-9 w-9 shrink-0 rounded-full" />
            <Sk className="h-12 w-12 shrink-0 rounded-full" />
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <Sk className="h-4 w-28 rounded-md" />
                <Sk className="h-4 w-14 rounded-md" />
              </div>
              <Sk className="h-3 w-24 rounded-md" />
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Sk className="h-10 w-10 rounded-full" />
            <Sk className="h-10 w-10 rounded-full" />
          </div>
        </div>

        <div className="px-4 pb-1.5">
          <Sk className="h-8 w-full rounded-lg" />
        </div>

        {isSupplier && (
          <div className="px-4 pb-1.5">
            <div className="flex gap-1 rounded-lg bg-muted p-0.5">
              <Sk className="h-8 flex-1 rounded-md bg-card/80" />
              <Sk className="h-8 flex-1 rounded-md opacity-60" />
            </div>
          </div>
        )}

        <div className="px-4 pb-3">
          <div className="surface-panel space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <Sk className="h-3 w-24 rounded-md" />
              <Sk className="h-3 w-20 rounded-md" />
            </div>
            <Sk className="h-1.5 w-full rounded-full" />
            <div className="grid grid-cols-2 gap-2">
              <Sk className="h-14 rounded-xl" />
              <Sk className="h-14 rounded-xl" />
            </div>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-hidden px-4 py-4">
        <div className="flex justify-center">
          <Sk className="h-6 w-28 rounded-full" />
        </div>
        <TransactionBubbleSkeleton withThumb />
        <TransactionBubbleSkeleton withThumb={false} />
        <TransactionBubbleSkeleton withThumb />
      </div>

      <div className="header-glass shrink-0 border-t border-black/[0.1] p-3 pb-safe dark:border-white/[0.1]">
        <Sk className="h-11 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function SettingsPageSkeleton({ className }) {
  return (
    <div className={cn("min-h-dvh bg-background", className)}>
      <div className="header-glass sticky top-0 z-20 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Sk className="h-10 w-10 shrink-0 rounded-full" />
          <Sk className="h-6 w-24 rounded-md" />
        </div>
      </div>

      <div className="space-y-6 px-4 py-4 pb-safe">
        {[3, 2, 2].map((count, section) => (
          <div key={section}>
            <Sk className="mb-3 ml-1 h-3 w-20 rounded-md" />
            <div className="space-y-2">
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="stat-card flex items-center gap-3 p-3.5">
                  <Sk className="h-11 w-11 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Sk className="h-3.5 w-28 rounded-md" />
                    <Sk className="h-3 w-40 max-w-full rounded-md" />
                  </div>
                  <Sk className="h-5 w-5 shrink-0 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}