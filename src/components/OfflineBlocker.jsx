"use client";

import { WifiOff } from "lucide-react";
import useOnlineStatus from "@/hooks/useOnlineStatus";

export function OfflineBlocker() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md">
      <div className="flex max-w-sm flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <WifiOff className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold">No Internet Connection</h2>
        <p className="text-muted-foreground">
          Please connect to the internet to use this app. All data is stored in the cloud and
          requires an active connection.
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          <span>Waiting for connection...</span>
        </div>
      </div>
    </div>
  );
}

export default OfflineBlocker;
