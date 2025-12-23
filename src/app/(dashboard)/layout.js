"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Store } from "lucide-react";
import { isAuthenticated, verifySession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { OfflineBlocker } from "@/components/OfflineBlocker";
import { NavigationProgress } from "@/components/NavigationProgress";
import { GlobalSearch } from "@/components/GlobalSearch";
import { GlobalLoadingBar } from "@/components/GlobalLoadingBar";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [isRehydrating, setIsRehydrating] = useState(false);
  const lastServerCheckRef = useRef(0);

  // Quick local auth check (for initial render)
  const checkAuthLocal = useCallback(() => {
    const authed = isAuthenticated();
    if (!authed) {
      router.replace("/login");
      return false;
    }
    return true;
  }, [router]);

  // Full server-side session verification
  const verifySessionWithServer = useCallback(async () => {
    try {
      const result = await verifySession();
      if (!result.authenticated) {
        // Session invalidated (password changed on another device)
        router.replace("/login");
        return false;
      }
      lastServerCheckRef.current = Date.now();
      return true;
    } catch {
      // On error, keep user logged in if local cookie exists
      return isAuthenticated();
    }
  }, [router]);

  // Initial auth check
  useEffect(() => {
    const initAuth = async () => {
      // Quick local check first
      if (!checkAuthLocal()) return;

      // Then verify with server
      const isValid = await verifySessionWithServer();
      if (isValid) {
        setIsAuthed(true);
        setIsChecking(false);
      }
    };

    const timer = setTimeout(initAuth, 50);
    return () => clearTimeout(timer);
  }, [checkAuthLocal, verifySessionWithServer]);

  // Handle visibility change for PWA resume
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        // App is now visible (resumed from background)
        setIsRehydrating(true);

        // Check if we need to verify with server (throttle to every 30 seconds)
        const timeSinceLastCheck = Date.now() - lastServerCheckRef.current;
        if (timeSinceLastCheck > 30000) {
          // Verify session with server when resuming
          const isValid = await verifySessionWithServer();
          if (!isValid) {
            return; // Will redirect to login
          }
        }

        // Quick revalidation
        requestAnimationFrame(() => {
          setTimeout(() => {
            setIsRehydrating(false);
          }, 100);
        });
      }
    };

    // Handle page show event (for PWA back/forward cache)
    const handlePageShow = async event => {
      if (event.persisted) {
        // Page was restored from cache - always verify with server
        setIsRehydrating(true);
        const isValid = await verifySessionWithServer();
        if (isValid) {
          setIsRehydrating(false);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [verifySessionWithServer]);

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
      {/* Global Loading Bar - shows when API calls are in progress */}
      <GlobalLoadingBar />

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
