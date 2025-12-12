"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Store } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { OfflineIndicator } from "@/components/OfflineIndicator";
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
    const handlePageShow = (event) => {
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Store className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">Shop Manager</span>
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Rehydration overlay - brief flash when resuming from background */}
      {isRehydrating && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center transition-opacity">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <OfflineIndicator />
      <Sidebar />
      <MobileNav />

      {/* Main content */}
      <main className="lg:pl-64">
        {/* Search Header */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b lg:border-b-0">
          <div className="hidden lg:block px-6 py-3">
            <GlobalSearch className="max-w-md" />
          </div>
        </div>

        <div className="pt-14 lg:pt-0 pb-20 lg:pb-6">{children}</div>
      </main>
    </div>
  );
}
