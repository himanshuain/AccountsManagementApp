"use client";

import { useState } from "react";
import { TrendingUp, MoreVertical, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHART_DURATION_OPTIONS } from "@/lib/constants";

/**
 * Simple Bar Chart Component with dynamic height based on 10k base
 */
export function IncomeChart({ data, duration, onDurationChange, profitMargin, onProfitMarginChange }) {
  const [showMenu, setShowMenu] = useState(false);

  // Base value for height calculation (10k = 1 unit height)
  const BASE_VALUE = 10000;
  const CHART_HEIGHT = 140; // pixels

  if (!data || data.length === 0) {
    // Show empty placeholder chart
    return (
      <div className="theme-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-medium">
            <TrendingUp className="h-4 w-4 text-primary" />
            Revenue Trend
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {CHART_DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
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
            {/* Three-dot menu */}
            <div className="relative">
              <button
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
        </div>
        <div className="flex items-end justify-between gap-1" style={{ height: CHART_HEIGHT }}>
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div className="h-1 w-full rounded-t-sm bg-muted" />
              <span className="w-full truncate text-center text-[9px] text-muted-foreground">
                -
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">No income data yet</p>
      </div>
    );
  }

  // Calculate max units based on 10k base for better UX
  const maxValue = Math.max(...data.map(d => d.value), BASE_VALUE);
  const maxUnits = Math.ceil(maxValue / BASE_VALUE);
  const totalRevenue = data.reduce((sum, d) => sum + d.value, 0);
  const totalProfit = Math.round(totalRevenue * (profitMargin / 100));

  // Calculate height for each bar based on 10k units
  const getBarHeight = value => {
    if (value <= 0) return 4;
    const units = value / BASE_VALUE;
    // Scale to chart height with min height of 8px
    const percentage = Math.min((units / maxUnits) * 100, 100);
    return Math.max(percentage, 5);
  };

  // Format value for display
  const formatValue = value => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
    return `₹${value}`;
  };

  const durationLabel = CHART_DURATION_OPTIONS.find(o => o.value === duration)?.months || 6;

  return (
    <div className="theme-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-medium">
          <TrendingUp className="h-4 w-4 text-primary" />
          Revenue Trend
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {CHART_DURATION_OPTIONS.map(opt => (
              <button
                key={opt.value}
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
          {/* Three-dot menu */}
          <div className="relative">
            <button
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
      </div>

      {/* Y-axis scale indicator */}
      <div className="mb-2 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
        <span>Max: {formatValue(maxValue)}</span>
      </div>

      <div className="flex items-end justify-between gap-1" style={{ height: CHART_HEIGHT }}>
        {data.map((item, idx) => {
          const profit = Math.round(item.value * (profitMargin / 100));
          return (
            <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div className="mb-1 text-center font-mono text-[10px] leading-tight text-muted-foreground">
                {item.value > 0 && (
                  <>
                    <div>{formatValue(item.value)}</div>
                    <div className="text-[9px] text-emerald-600 dark:text-emerald-400">
                      {formatValue(profit)}
                    </div>
                  </>
                )}
              </div>
              {/* Stacked bar: profit on top of revenue */}
              <div
                className="relative w-full overflow-hidden rounded-t-sm transition-all duration-300"
                style={{
                  height: `${getBarHeight(item.value)}%`,
                  minHeight: item.value > 0 ? "8px" : "4px",
                }}
              >
                {/* Base revenue bar */}
                <div className="absolute inset-0 bg-gradient-to-t from-blue-600/70 to-blue-400/70" />
                {/* Profit overlay (bottom portion) */}
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-600 to-emerald-400"
                  style={{ height: `${profitMargin}%` }}
                />
              </div>
              <span className="w-full truncate text-center text-[9px] font-medium text-muted-foreground">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-gradient-to-t from-blue-600/70 to-blue-400/70" />
          <span className="text-muted-foreground">Revenue</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-gradient-to-t from-emerald-600 to-emerald-400" />
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
