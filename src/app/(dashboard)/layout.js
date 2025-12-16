"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Store } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { OfflineBlocker } from "@/components/OfflineBlocker";
import { NavigationProgress } from "@/components/NavigationProgress";
import { GlobalSearch } from "@/components/GlobalSearch";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [isRehydrating, setIsRehydrating] = useState(false);

  // Check authentication
  const checkAuth = useCallback(() => {
    const authed = isAuthenticated();
    if (!authed) {
      router.replace("/login");
    } else {
      setIsAuthed(true);
      setIsChecking(false);
      setIsRehydrating(false);
    }
  }, [router]);

  useEffect(() => {
    // Initial auth check with small delay
    const timer = setTimeout(checkAuth, 50);
    return () => clearTimeout(timer);
  }, [checkAuth]);

  // Handle visibility change for PWA resume
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // App is now visible (resumed from background)
        // Show brief rehydrating state to prevent freeze appearance
        setIsRehydrating(true);

        // Quick revalidation
        requestAnimationFrame(() => {
          // Allow React to update
          setTimeout(() => {
            setIsRehydrating(false);
          }, 100);
        });
      }
    };

    // Handle page show event (for PWA back/forward cache)
    const handlePageShow = event => {
      if (event.persisted) {
        // Page was restored from cache
        setIsRehydrating(true);
        setTimeout(() => {
          checkAuth();
        }, 50);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [checkAuth]);

  // Loading state during auth check
  if (isChecking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Store className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">Shop Manager</span>
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Offline Blocker - blocks the entire app when offline */}
      <OfflineBlocker />

      {/* Rehydration overlay - brief flash when resuming from background */}
      {isRehydrating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Sidebar />
      <MobileNav />

      {/* Main content */}
      <main className="lg:pl-64">
        {/* Desktop Search Header - only visible on lg screens */}
        <div className="sticky top-0 z-30 hidden border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:block">
          <div className="px-6 py-3">
            <GlobalSearch className="max-w-md" />
          </div>
        </div>

        <div className="pb-20 pt-14 lg:pb-6 lg:pt-0">{children}</div>
      </main>
    </div>
  );
}
