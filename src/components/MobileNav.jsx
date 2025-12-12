"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Receipt,
  Menu,
  Store,
  LogOut,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { GlobalSearch } from "./GlobalSearch";
import { SyncStatus } from "./SyncStatus";
import { ThemeToggle } from "./ThemeToggle";
import { logout } from "@/lib/auth";
import { toast } from "sonner";

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    color: "bg-blue-500",
    activeColor: "bg-blue-600",
    iconColor: "text-blue-500",
  },
  {
    href: "/suppliers",
    label: "Suppliers",
    icon: Users,
    color: "bg-emerald-500",
    activeColor: "bg-emerald-600",
    iconColor: "text-emerald-500",
  },
  {
    href: "/transactions",
    label: "Transactions",
    icon: Receipt,
    color: "bg-purple-500",
    activeColor: "bg-purple-600",
    iconColor: "text-purple-500",
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
    color: "bg-amber-500",
    activeColor: "bg-amber-600",
    iconColor: "text-amber-500",
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate all queries to force refetch
      await queryClient.invalidateQueries();
      toast.success("Data refreshed!");
    } catch (error) {
      toast.error("Failed to refresh");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get current tab index
  const currentIndex = navItems.findIndex(
    (item) =>
      pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(item.href)),
  );

  // Handle swipe navigation
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex < navItems.length - 1) {
        // Swipe left - go to next
        router.push(navItems[currentIndex + 1].href);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right - go to previous
        router.push(navItems[currentIndex - 1].href);
      }
    }
    setTouchStart(null);
  };

  return (
    <>
      {/* Top bar with search */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-b">
        {/* Header row */}
        <div className="h-14 flex items-center px-3 gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="p-0">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              </SheetHeader>

              {/* Mobile Menu Content */}
              <div className="flex flex-col h-full">
                {/* Logo */}
                <div className="h-16 flex items-center gap-2 px-6 border-b">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <Store className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="font-semibold text-lg">Shop Manager</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-4 space-y-1">
                  {navItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(item.href));

                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? `${item.color} text-white`
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          {item.label}
                        </div>
                      </Link>
                    );
                  })}
                </nav>

                {/* Bottom section */}
                <div className="p-4 space-y-4 border-t">
                  <div className="flex items-center justify-between">
                    <SyncStatus />
                    <ThemeToggle />
                  </div>
                  <Separator />
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Full width search bar */}
          <GlobalSearch className="flex-1" />

          {/* Refresh button */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("h-5 w-5", isRefreshing && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      {/* Swipe area for navigation */}
      <div
        className="lg:hidden fixed inset-0 z-30 pointer-events-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ pointerEvents: "auto", top: "3.5rem", bottom: "4rem" }}
      />

      {/* Bottom navigation - Colorful tiles */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-t safe-area-bottom">
        <div ref={scrollRef} className="flex items-stretch h-16 px-1">
          {navItems.map((item, index) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link key={item.href} href={item.href} className="flex-1 p-1">
                <div
                  className={cn(
                    "flex flex-col items-center justify-center h-full rounded-xl transition-all",
                    isActive
                      ? `${item.color} text-white shadow-lg scale-105`
                      : "text-muted-foreground hover:bg-accent/50",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 mb-0.5",
                      !isActive && item.iconColor,
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      !isActive && "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export default MobileNav;
