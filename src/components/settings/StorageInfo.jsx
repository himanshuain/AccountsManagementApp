"use client";

import { Database, ImageIcon } from "lucide-react";
import { useStorage } from "@/hooks/useStorage";
import { cn } from "@/lib/utils";

/**
 * Storage Info Component - Shows R2 storage usage
 */
export function StorageInfo() {
  const { storageInfo, loading, error } = useStorage();

  if (loading) {
    return (
      <div className="theme-card p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Database className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-3 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !storageInfo) {
    return (
      <div className="theme-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Database className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium">Storage</h3>
            <p className="text-xs text-muted-foreground">Unable to load storage info</p>
          </div>
        </div>
      </div>
    );
  }

  const usedPercent = storageInfo.usedPercentage || 0;

  return (
    <div className="theme-card p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20">
          <Database className="h-6 w-6 text-blue-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium">Storage (R2)</h3>
          <p className="text-xs text-muted-foreground">
            {storageInfo.usedFormatted} of {storageInfo.totalFormatted} used
          </p>
        </div>
        <span className="font-mono text-sm">{usedPercent.toFixed(1)}%</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            usedPercent > 90 ? "bg-red-500" : usedPercent > 70 ? "bg-amber-500" : "bg-blue-500"
          )}
          style={{ width: `${Math.min(usedPercent, 100)}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <ImageIcon className="h-3 w-3" />
          {storageInfo.fileCount || 0} images
        </span>
        <span>{storageInfo.remainingFormatted} remaining</span>
      </div>
    </div>
  );
}

export default StorageInfo;
