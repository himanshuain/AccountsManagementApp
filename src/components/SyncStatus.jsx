"use client";

import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import useSync from "@/hooks/useSync";
import useOnlineStatus from "@/hooks/useOnlineStatus";

export function SyncStatus() {
  const { status, pendingCount, lastSync, isSyncing, triggerSync } = useSync();
  const isOnline = useOnlineStatus();

  const handleSync = async () => {
    await triggerSync();
  };

  const getStatusIcon = () => {
    if (!isOnline)
      return <CloudOff className="h-4 w-4 text-muted-foreground" />;
    if (isSyncing)
      return <RefreshCw className="h-4 w-4 text-primary animate-spin" />;
    if (status === "error")
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (pendingCount > 0)
      return <Cloud className="h-4 w-4 text-amber-500 animate-sync-pulse" />;
    return <Check className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!isOnline) return "Offline";
    if (isSyncing) return "Syncing...";
    if (status === "error") return "Sync failed";
    if (pendingCount > 0) return `${pendingCount} pending`;
    return "Synced";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>

      {pendingCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          {pendingCount}
        </Badge>
      )}

      {isOnline && pendingCount > 0 && !isSyncing && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSync}
          className="h-7 px-2"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Sync
        </Button>
      )}
    </div>
  );
}

export default SyncStatus;
