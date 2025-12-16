"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Receipt,
  LogOut,
  Store,
  RefreshCw,
  BarChart3,
  UserCircle,
  Trash2,
  Activity,
  Key,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "./ThemeToggle";
import { logout } from "@/lib/auth";
import { toast } from "sonner";
import { useStorage } from "@/hooks/useStorage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PinInput } from "@/components/PinInput";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/suppliers", label: "Vyapari", icon: Users },
  { href: "/customers", label: "Customers", icon: UserCircle },
  { href: "/reports", label: "Revenue", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [passwordSheetOpen, setPasswordSheetOpen] = useState(false);
  const [passwordStep, setPasswordStep] = useState("current"); // "current", "new", "confirm"
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pinError, setPinError] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const { storageInfo, loading: storageLoading, isBandwidth } = useStorage();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const handleCurrentPinComplete = pin => {
    setCurrentPassword(pin);
    setPasswordStep("new");
  };

  const handleNewPinComplete = pin => {
    setNewPassword(pin);
    setPasswordStep("confirm");
  };

  const handleConfirmPinComplete = async pin => {
    if (pin !== newPassword) {
      setPinError(true);
      toast.error("PINs do not match. Please try again.");
      setTimeout(() => {
        setPinError(false);
        setPasswordStep("new");
        setNewPassword("");
      }, 1000);
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("PIN changed successfully");
        resetPasswordForm();
      } else {
        setPinError(true);
        toast.error(data.error || "Failed to change PIN");
        setTimeout(() => {
          setPinError(false);
          resetPasswordForm();
        }, 1000);
      }
    } catch (error) {
      toast.error("Failed to change PIN");
      resetPasswordForm();
    } finally {
      setIsChangingPassword(false);
    }
  };

  const resetPasswordForm = () => {
    setPasswordSheetOpen(false);
    setPasswordStep("current");
    setCurrentPassword("");
    setNewPassword("");
    setPinError(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries();
      toast.success("Data refreshed!");
    } catch (error) {
      toast.error("Failed to refresh");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearSiteData = async () => {
    setIsClearing(true);
    try {
      // Clear IndexedDB
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }

      // Clear localStorage
      localStorage.clear();

      // Clear sessionStorage
      sessionStorage.clear();

      // Clear cache storage
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      toast.success("Site data cleared! Reloading...");

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Failed to clear site data:", error);
      toast.error("Failed to clear site data");
      setIsClearing(false);
    }
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card/95 backdrop-blur-sm border-r">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2 px-6 border-b">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Store className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-semibold text-lg">Shop Manager</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map(item => {
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
      <div className="p-4 space-y-4">
        <Separator />

        {/* Storage Usage */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>Storage</span>
            {storageInfo?.fileCount && (
              <span className="text-xs text-muted-foreground">({storageInfo.fileCount} photos)</span>
            )}
          </div>
          {storageLoading ? (
            <div className="h-2 bg-muted rounded-full animate-pulse" />
          ) : storageInfo ? (
            <div className="space-y-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    storageInfo.usedPercentage > 80
                      ? "bg-destructive"
                      : storageInfo.usedPercentage > 50
                      ? "bg-amber-500"
                      : "bg-green-500"
                  )}
                  style={{ width: `${Math.min(storageInfo.usedPercentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {storageInfo.usedFormatted} / {storageInfo.totalFormatted} (
                {storageInfo.usedPercentage}%)
              </p>
              {isBandwidth && storageInfo.storageFormatted && (
                <p className="text-xs text-muted-foreground">
                  Storage: {storageInfo.storageFormatted}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Unable to load</p>
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Cloud Connected</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
            <ThemeToggle />
          </div>
        </div>
        <Separator />

        {/* Change Password Button */}
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={() => setPasswordSheetOpen(true)}
        >
          <Key className="h-4 w-4 mr-2" />
          Change Password
        </Button>

        {/* Clear Site Data Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              disabled={isClearing}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isClearing ? "Clearing..." : "Clear Site Data"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Site Data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will clear all locally cached data on this device. Your cloud data will not be
                affected. The page will reload after clearing.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearSiteData}>Clear Data</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Change PIN Sheet */}
      <Sheet
        open={passwordSheetOpen}
        onOpenChange={open => {
          if (!open) resetPasswordForm();
          else setPasswordSheetOpen(open);
        }}
      >
        <SheetContent side="bottom" className="h-auto rounded-t-2xl" hideClose>
          <SheetHeader className="pb-4 text-center">
            <SheetTitle>
              {passwordStep === "current" && "Enter Current PIN"}
              {passwordStep === "new" && "Enter New PIN"}
              {passwordStep === "confirm" && "Confirm New PIN"}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              {passwordStep === "current" && "Enter your current 6-digit PIN"}
              {passwordStep === "new" && "Enter your new 6-digit PIN"}
              {passwordStep === "confirm" && "Re-enter your new PIN to confirm"}
            </p>
          </SheetHeader>
          <div className="py-6">
            {passwordStep === "current" && (
              <PinInput
                key="current-pin"
                length={6}
                onComplete={handleCurrentPinComplete}
                error={pinError}
              />
            )}
            {passwordStep === "new" && (
              <PinInput
                key="new-pin"
                length={6}
                onComplete={handleNewPinComplete}
                error={pinError}
              />
            )}
            {passwordStep === "confirm" && (
              <PinInput
                key="confirm-pin"
                length={6}
                onComplete={handleConfirmPinComplete}
                error={pinError}
              />
            )}

            {isChangingPassword && (
              <p className="text-center text-sm text-muted-foreground mt-4">Changing PIN...</p>
            )}
          </div>
          <div className="flex gap-3 pb-6">
            <Button variant="outline" className="flex-1" onClick={resetPasswordForm}>
              Cancel
            </Button>
            {passwordStep !== "current" && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (passwordStep === "new") {
                    setPasswordStep("current");
                    setCurrentPassword("");
                  } else if (passwordStep === "confirm") {
                    setPasswordStep("new");
                    setNewPassword("");
                  }
                }}
              >
                Back
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </aside>
  );
}

export default Sidebar;
