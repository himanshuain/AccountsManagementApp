"use client";

import { WifiOff } from "lucide-react";
import useOnlineStatus from "@/hooks/useOnlineStatus";

export function OfflineBlocker() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4 p-8 max-w-sm text-center">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <WifiOff className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold">No Internet Connection</h2>
        <p className="text-muted-foreground">
          Please connect to the internet to use this app. All data is stored in
          the cloud and requires an active connection.
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Waiting for connection...</span>
        </div>
      </div>
    </div>
  );
}

export default OfflineBlocker;
