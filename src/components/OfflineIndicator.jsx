"use client";

import { WifiOff } from "lucide-react";
import useOnlineStatus from "@/hooks/useOnlineStatus";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-[4.5rem] left-2 right-2 z-40 bg-neutral-800 text-white px-3 py-1.5 rounded-lg shadow-lg lg:bottom-2">
      <div className="flex items-center justify-center gap-2 text-xs">
        <WifiOff className="h-3 w-3" />
        <span>No internet connection</span>
      </div>
    </div>
  );
}

export default OfflineIndicator;
