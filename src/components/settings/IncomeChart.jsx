"use client";

import { useState } from "react";
import { TrendingUp, MoreVertical, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHART_DURATION_OPTIONS } from "@/lib/constants";

/**
 * Revenue / profit stacked bar chart for income tracker.
 */
export function IncomeChart({
  data,
  duration,
  onDurationChange,
  profitMargin,
  onProfitMarginChange,
  className,
}) {
  const [showMenu, setShowMenu] = useState(false);

  const BASE_VALUE = 10000;
  const CHART_HEIGHT = 168;

  const durationControls = (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {CHART_DURATION_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onDurationChange?.(opt.value)}
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium transition-colors",
              duration === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          className="rounded-lg p-1.5 transition-colors hover:bg-muted"
        >
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border bg-card p-3 shadow-lg">
              <div className="mb-3 flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Profit Margin</span>
              </div>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={profitMargin}
                  onChange={e => onProfitMarginChange?.(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">0%</span>
                  <span className="font-bold text-primary">{profitMargin}%</span>
                  <span className="text-muted-foreground">100%</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const formatValue = value => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
    return `₹${value}`;
  };

  const durationLabel = CHART_DURATION_OPTIONS.find(o => o.value === duration)?.months || 6;

  if (!data || data.length === 0) {
    return (
      <div className={cn("theme-card p-4", className)}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-medium">
            <TrendingUp className="h-4 w-4 text-primary" />
            Revenue Trend
          </h3>
          {durationControls}
        </div>
        <div className="flex items-end justify-between gap-1" style={{ height: CHART_HEIGHT }}>
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div className="mb-6 flex w-full flex-1 items-center justify-center rounded-t-sm border border-dashed border-border bg-muted/25">
                <span className="text-[10px] font-medium text-muted-foreground">N/A</span>
              </div>
              <span className="w-full truncate text-center text-[9px] text-muted-foreground">-</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">No income data yet</p>
      </div>
    );
  }

  const positiveValues = data.map(d => d.value).filter(v => v > 0);
  const maxValue = Math.max(...positiveValues, BASE_VALUE);
  const maxUnits = Math.ceil(maxValue / BASE_VALUE);
  const totalRevenue = data.reduce((sum, d) => sum + d.value, 0);
  const totalProfit = Math.round(totalRevenue * (profitMargin / 100));

  const getBarHeight = value => {
    if (value <= 0) return 0;
    const units = value / BASE_VALUE;
    const percentage = Math.min((units / maxUnits) * 100, 100);
    return Math.max(percentage, 12);
  };

  const profitFlex = Math.max(profitMargin, 22);
  const revenueFlex = 100 - profitFlex;
  const maxDataValue = positiveValues.length > 0 ? Math.max(...positiveValues) : 0;

  return (
    <div className={cn("theme-card p-4", className)}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-medium">
          <TrendingUp className="h-4 w-4 text-primary" />
          Revenue Trend
        </h3>
        {durationControls}
      </div>

      <div className="flex items-end justify-between gap-1" style={{ height: CHART_HEIGHT }}>
        {data.map((item, idx) => {
          const hasValue = item.value > 0;
          const profit = Math.round(item.value * (profitMargin / 100));
          const isPeakMonth = hasValue && item.value === maxDataValue;

          return (
            <div key={idx} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              {hasValue ? (
                <div
                  className="relative flex w-full min-h-[3rem] flex-col overflow-hidden rounded-t-md border border-border/50 shadow-sm"
                  style={{
                    height: `${getBarHeight(item.value)}%`,
                  }}
                >
                  {isPeakMonth && (
                    <span className="pointer-events-none absolute left-1/2 top-1 z-[1] -translate-x-1/2 rounded bg-foreground/90 px-1 py-px text-[7px] font-bold uppercase tracking-wider text-background shadow-sm">
                      Max
                    </span>
                  )}
                  <div
                    className="flex min-h-[1.25rem] items-center justify-center bg-blue-500/85 px-0.5 dark:bg-blue-600/80"
                    style={{ flex: `${revenueFlex} 1 0%` }}
                  >
                    <span className="text-center font-mono text-[8px] font-semibold leading-tight text-white sm:text-[9px]">
                      {formatValue(item.value)}
                    </span>
                  </div>
                  <div
                    className="flex min-h-[1.25rem] items-center justify-center bg-emerald-600/90 px-0.5 dark:bg-emerald-600/85"
                    style={{ flex: `${profitFlex} 1 0%` }}
                  >
                    <span className="text-center font-mono text-[8px] font-semibold leading-tight text-white sm:text-[9px]">
                      {formatValue(profit)}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className="flex w-full items-center justify-center rounded-t-md border border-dashed border-border bg-muted/20"
                  style={{ height: "2.5rem" }}
                >
                  <span className="text-[10px] font-semibold text-muted-foreground">N/A</span>
                </div>
              )}
              <span className="w-full truncate text-center text-[9px] font-medium text-muted-foreground">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-blue-500/85" />
          <span className="text-muted-foreground">Revenue</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-emerald-600/90" />
          <span className="text-muted-foreground">Profit ({profitMargin}%)</span>
        </div>
      </div>

      <div className="mt-3 flex justify-between text-xs">
        <span className="text-muted-foreground">{durationLabel} Month Total:</span>
        <div className="text-right">
          <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
            {formatValue(totalRevenue)}
          </span>
          <span className="mx-1 text-muted-foreground">•</span>
          <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
            {formatValue(totalProfit)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default IncomeChart;