"use client";

import { WifiOff } from "lucide-react";
import useOnlineStatus from "@/hooks/useOnlineStatus";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-800 text-white px-4 py-1.5">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs">
        <WifiOff className="h-3 w-3" />
        <span>No internet connection</span>
      </div>
    </div>
  );
}

export default OfflineIndicator;
