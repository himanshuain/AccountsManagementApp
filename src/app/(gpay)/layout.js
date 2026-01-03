"use client";

import { BottomTabs } from "@/components/gpay/BottomTabs";
import { OfflineBlocker } from "@/components/OfflineBlocker";

export default function GPayLayout({ children }) {
  return (
    <div className="relative min-h-screen bg-transparent text-foreground">
      <OfflineBlocker />

      {/* Main content with bottom padding for nav bar (56px + safe area) */}
      <main className="pb-nav relative" style={{ zIndex: 10 }}>
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomTabs />
    </div>
  );
}
