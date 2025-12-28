"use client";

import { BottomTabs } from "@/components/gpay/BottomTabs";
import { OfflineBlocker } from "@/components/OfflineBlocker";

export default function GPayLayout({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Theme background pattern - subtle and theme-aware */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Light mode: Web pattern */}
        <div className="absolute inset-0 bg-miles-pattern opacity-30 dark:opacity-0 transition-opacity duration-500" />
        {/* Dark mode: Hex pattern */}
        <div className="absolute inset-0 bg-ironman-pattern opacity-0 dark:opacity-30 transition-opacity duration-500" />
      </div>
      
      <OfflineBlocker />
      
      {/* Main content with bottom padding for nav bar (56px + safe area) */}
      <main className="relative z-10 pb-nav">
        {children}
      </main>
      
      {/* Bottom navigation */}
      <BottomTabs />
    </div>
  );
}
