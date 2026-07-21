"use client";

import { OfflineBlocker } from "@/components/OfflineBlocker";

export default function GPayLayout({ children }) {
  return (
    <div className="relative min-h-screen bg-transparent text-foreground">
      <OfflineBlocker />

      <main className="relative pb-safe" style={{ zIndex: 10 }}>
        {children}
      </main>
    </div>
  );
}
