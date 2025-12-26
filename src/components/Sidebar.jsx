"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Store,
  RefreshCw,
  BarChart3,
  UserCircle,
  Trash2,
  Activity,
  Key,
  HardDrive,
  Fingerprint,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "./ThemeToggle";
import { logout } from "@/lib/auth";
import { toast } from "sonner";
import { useStorage } from "@/hooks/useStorage";
import { useBiometric } from "@/hooks/useBiometric";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { BackupManager } from "./BackupManager";

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
  const [biometricSheetOpen, setBiometricSheetOpen] = useState(false);
  const [passwordStep, setPasswordStep] = useState("current"); // "current", "new", "confirm"
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [backupSheetOpen, setBackupSheetOpen] = useState(false);

  const { storageInfo, loading: storageLoading } = useStorage();
  const {
    isSupported: biometricSupported,
    isEnabled: biometricEnabled,
    isLoading: biometricLoading,
    registerBiometric,
    disableBiometric,
  } = useBiometric();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const handlePasswordChange = async () => {
    setPasswordError("");

    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }

    if (!newPassword) {
      setPasswordError("New password is required");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
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
        toast.success("Password changed successfully");
        resetPasswordForm();
      } else {
        setPasswordError(data.error || "Failed to change password");
      }
    } catch (error) {
      setPasswordError("Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const resetPasswordForm = () => {
    setPasswordSheetOpen(false);
    setPasswordStep("current");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleBiometricSetup = async () => {
    try {
      await registerBiometric();
      toast.success("Biometric login enabled!");
      setBiometricSheetOpen(false);
    } catch (error) {
      toast.error(error.message || "Failed to setup biometric login");
    }
  };

  const handleBiometricDisable = async () => {
    try {
      await disableBiometric();
      toast.success("Biometric login disabled");
      setBiometricSheetOpen(false);
    } catch (error) {
      toast.error("Failed to disable biometric login");
    }
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
    <aside className="hidden border-r bg-card/95 backdrop-blur-sm lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Store className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold">Shop Manager</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-4">
        {navItems.map(item => {
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
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
      <div className="space-y-4 p-4">
        <Separator />

        {/* Storage Usage */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>Storage</span>
          </div>
          {storageLoading ? (
            <div className="h-2 animate-pulse rounded-full bg-muted" />
          ) : storageInfo ? (
            <div className="space-y-2">
              {/* Progress bar */}
              <div className="h-2 overflow-hidden rounded-full bg-muted">
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
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{storageInfo.usedFormatted}</span>
                  {" / "}
                  {storageInfo.totalFormatted} ({storageInfo.usedPercentage}%)
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {storageInfo.remainingFormatted} remaining
                </p>
                {storageInfo?.fileCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {storageInfo.fileCount} files stored
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Unable to load storage info</p>
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

        {/* Backup & Restore Button */}
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={() => setBackupSheetOpen(true)}
        >
          <HardDrive className="mr-2 h-4 w-4" />
          Backup & Restore
        </Button>

        {/* Biometric Login Button */}
        {biometricSupported && (
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={() => setBiometricSheetOpen(true)}
          >
            <Fingerprint className="mr-2 h-4 w-4" />
            Biometric Login
            {biometricEnabled && (
              <CheckCircle2 className="ml-auto h-4 w-4 text-green-500" />
            )}
          </Button>
        )}

        {/* Change Password Button */}
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={() => setPasswordSheetOpen(true)}
        >
          <Key className="mr-2 h-4 w-4" />
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
              <Trash2 className="mr-2 h-4 w-4" />
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
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Change Password Sheet */}
      <Sheet
        open={passwordSheetOpen}
        onOpenChange={open => {
          if (!open) resetPasswordForm();
          else setPasswordSheetOpen(open);
        }}
      >
        <SheetContent side="bottom" className="h-auto rounded-t-2xl">
          <SheetHeader className="pb-4 text-left">
            <SheetTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Change Password
            </SheetTitle>
            <SheetDescription>
              Enter your current password and choose a new one
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="pl-10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="pl-10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pl-10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
          </div>

          <div className="flex gap-3 pb-6">
            <Button variant="outline" className="flex-1" onClick={resetPasswordForm}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handlePasswordChange}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Biometric Setup Sheet */}
      <Sheet open={biometricSheetOpen} onOpenChange={setBiometricSheetOpen}>
        <SheetContent side="bottom" className="h-auto rounded-t-2xl">
          <SheetHeader className="pb-4 text-left">
            <SheetTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              Biometric Login
            </SheetTitle>
            <SheetDescription>
              {biometricEnabled
                ? "Biometric login is currently enabled"
                : "Enable Face ID, Touch ID, or Fingerprint login"}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {biometricEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Biometric login is enabled
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      You can use Face ID, Touch ID, or Fingerprint to login
                    </p>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleBiometricDisable}
                  disabled={biometricLoading}
                >
                  {biometricLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disabling...
                    </>
                  ) : (
                    "Disable Biometric Login"
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    Enable biometric authentication to quickly login using your device&apos;s
                    Face ID, Touch ID, or Fingerprint sensor. This is more convenient and secure.
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={handleBiometricSetup}
                  disabled={biometricLoading}
                >
                  {biometricLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="mr-2 h-4 w-4" />
                      Enable Biometric Login
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="pb-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setBiometricSheetOpen(false)}
            >
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Backup Manager Sheet */}
      <BackupManager open={backupSheetOpen} onOpenChange={setBackupSheetOpen} />
    </aside>
  );
}

export default Sidebar;
