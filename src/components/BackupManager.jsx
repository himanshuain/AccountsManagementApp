"use client";

import { useState, useRef, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Download,
  Mail,
  Upload,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Calendar,
  FileJson,
  HardDrive,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DragCloseDrawer, DrawerHeader, DrawerTitle } from "@/components/ui/drag-close-drawer";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function BackupManager({ open, onOpenChange }) {
  const [activeTab, setActiveTab] = useState("backup"); // "backup" | "restore" | "logs"
  const [email, setEmail] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [backupPreview, setBackupPreview] = useState(null);
  const [restoreMode, setRestoreMode] = useState("merge");
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const fileInputRef = useRef(null);

  // Load saved email from localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem("backup_email");
    if (savedEmail) setEmail(savedEmail);
  }, []);

  // Fetch logs when logs tab is active
  useEffect(() => {
    if (activeTab === "logs" && open) {
      fetchLogs();
    }
  }, [activeTab, open]);

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/backup/logs");
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch("/api/backup");
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(data.backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shop-backup-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log the download
      await fetch("/api/backup/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "manual_download",
          status: "success",
          recordCounts: data.backup.counts,
          fileSizeBytes: blob.size,
        }),
      });

      toast.success("Backup downloaded successfully!");
    } catch (error) {
      toast.error("Failed to download backup: " + error.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEmailBackup = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Save email for future use
    localStorage.setItem("backup_email", email);

    setIsEmailing(true);
    try {
      const res = await fetch("/api/backup/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      toast.success(`Backup sent to ${email}!`);
    } catch (error) {
      toast.error("Failed to send backup: " + error.message);
    } finally {
      setIsEmailing(false);
    }
  };

  const handleFileSelect = e => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Please select a JSON backup file");
      return;
    }

    setSelectedFile(file);

    // Read and preview the backup
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const backup = JSON.parse(event.target.result);

        // Validate backup structure
        if (!backup.version || !backup.data) {
          toast.error("Invalid backup file format");
          setSelectedFile(null);
          return;
        }

        setBackupPreview({
          ...backup,
          fileSize: file.size,
        });
      } catch (err) {
        toast.error("Failed to parse backup file");
        setSelectedFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!selectedFile || !backupPreview) return;

    setIsRestoring(true);
    setShowRestoreConfirm(false);

    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backup: backupPreview,
          mode: restoreMode,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      toast.success(data.message);

      // Clear the form
      setSelectedFile(null);
      setBackupPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Refresh the page to show restored data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast.error("Failed to restore backup: " + error.message);
    } finally {
      setIsRestoring(false);
    }
  };

  const getTypeLabel = type => {
    switch (type) {
      case "manual_download":
        return { label: "Download", color: "bg-blue-500" };
      case "manual_email":
        return { label: "Email", color: "bg-purple-500" };
      case "scheduled_cron":
        return { label: "Scheduled", color: "bg-green-500" };
      default:
        return { label: type, color: "bg-gray-500" };
    }
  };

  const formatRecordCounts = counts => {
    if (!counts) return "N/A";
    const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
    return `${total} records`;
  };

  return (
    <>
      <DragCloseDrawer open={open} onOpenChange={onOpenChange} height="h-[85vh]">
        <div className="px-4">
        <DrawerHeader className="flex flex-col items-start gap-1 text-left">
          <DrawerTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Backup & Restore
          </DrawerTitle>
          <p className="text-sm text-muted-foreground">
            Download, email, or restore your shop data
          </p>
        </DrawerHeader>

          {/* Tab Navigation */}
          <div className="mt-4 flex gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => setActiveTab("backup")}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activeTab === "backup"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Backup
            </button>
            <button
              onClick={() => setActiveTab("restore")}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activeTab === "restore"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Restore
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activeTab === "logs"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              History
            </button>
          </div>

          {/* Tab Content */}
          <div className="mt-4 flex-1 overflow-y-auto pb-6">
            {/* Backup Tab */}
            {activeTab === "backup" && (
              <div className="space-y-6">
                {/* Download Section */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                      <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">Download Backup</h3>
                      <p className="text-sm text-muted-foreground">
                        Download a JSON file containing all your data
                      </p>
                      <Button className="mt-3" onClick={handleDownload} disabled={isDownloading}>
                        {isDownloading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Preparing...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Download Now
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Email Section */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
                      <Mail className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">Email Backup</h3>
                      <p className="text-sm text-muted-foreground">
                        Send backup file to your email for safekeeping
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="flex-1"
                        />
                        <Button onClick={handleEmailBackup} disabled={isEmailing || !email}>
                          {isEmailing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Auto Backup Info */}
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-green-100 p-2 dark:bg-green-900">
                      <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-green-800 dark:text-green-200">
                        Automatic Backups
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Your data is automatically backed up and emailed every 3 months. Configure
                        BACKUP_EMAIL in your environment to receive scheduled backups.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Restore Tab */}
            {activeTab === "restore" && (
              <div className="space-y-6">
                {/* Warning */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <h3 className="font-medium text-amber-800 dark:text-amber-200">
                        Restore with Caution
                      </h3>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Restoring will modify your database. Consider downloading a backup first.
                      </p>
                    </div>
                  </div>
                </div>

                {/* File Upload */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-orange-100 p-2 dark:bg-orange-900">
                      <Upload className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">Upload Backup File</h3>
                      <p className="text-sm text-muted-foreground">
                        Select a JSON backup file to restore
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileSelect}
                        className="mt-3 w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                      />
                    </div>
                  </div>
                </div>

                {/* Backup Preview */}
                {backupPreview && (
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-3 flex items-center gap-2 font-medium">
                      <FileJson className="h-4 w-4" />
                      Backup Preview
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created</span>
                        <span>{format(new Date(backupPreview.exportedAt), "PPp")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">File Size</span>
                        <span>{(backupPreview.fileSize / 1024).toFixed(1)} KB</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded bg-muted p-2 text-center">
                          <div className="text-lg font-semibold">
                            {backupPreview.counts?.suppliers || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Suppliers</div>
                        </div>
                        <div className="rounded bg-muted p-2 text-center">
                          <div className="text-lg font-semibold">
                            {backupPreview.counts?.transactions || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Transactions</div>
                        </div>
                        <div className="rounded bg-muted p-2 text-center">
                          <div className="text-lg font-semibold">
                            {backupPreview.counts?.customers || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Customers</div>
                        </div>
                        <div className="rounded bg-muted p-2 text-center">
                          <div className="text-lg font-semibold">
                            {backupPreview.counts?.udhar || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Udhar</div>
                        </div>
                      </div>
                    </div>

                    {/* Restore Mode */}
                    <div className="mt-4">
                      <Label className="text-sm font-medium">Restore Mode</Label>
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant={restoreMode === "merge" ? "default" : "outline"}
                          size="sm"
                          className="flex-1"
                          onClick={() => setRestoreMode("merge")}
                        >
                          Merge
                        </Button>
                        <Button
                          variant={restoreMode === "replace" ? "destructive" : "outline"}
                          size="sm"
                          className="flex-1"
                          onClick={() => setRestoreMode("replace")}
                        >
                          Replace All
                        </Button>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {restoreMode === "merge"
                          ? "Merge: Add new records, skip existing ones"
                          : "Replace: Delete all existing data and restore from backup"}
                      </p>
                    </div>

                    {/* Restore Button */}
                    <Button
                      className="mt-4 w-full"
                      variant={restoreMode === "replace" ? "destructive" : "default"}
                      onClick={() => setShowRestoreConfirm(true)}
                      disabled={isRestoring}
                    >
                      {isRestoring ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Restoring...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Restore Data
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Logs Tab */}
            {activeTab === "logs" && (
              <div className="space-y-3">
                {logsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <History className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    <p>No backup history yet</p>
                  </div>
                ) : (
                  logs.map(log => {
                    const typeInfo = getTypeLabel(log.type);
                    return (
                      <div key={log.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full",
                            log.status === "success"
                              ? "bg-green-100 dark:bg-green-900"
                              : "bg-red-100 dark:bg-red-900"
                          )}
                        >
                          {log.status === "success" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={cn("text-xs text-white", typeInfo.color)}
                            >
                              {typeInfo.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatRecordCounts(log.recordCounts)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                            {log.email && <span className="truncate">• {log.email}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {logs.length > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={fetchLogs}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DragCloseDrawer>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {restoreMode === "replace" ? "Replace All Data?" : "Merge Backup Data?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {restoreMode === "replace" ? (
                <>
                  This will <strong>delete all existing data</strong> and replace it with the
                  backup. This action cannot be undone.
                </>
              ) : (
                <>This will add new records from the backup. Existing records will be skipped.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              className={restoreMode === "replace" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {restoreMode === "replace" ? "Yes, Replace All" : "Merge Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Also export a hook for easier usage
export function useBackupManager() {
  const [open, setOpen] = useState(false);
  return { open, setOpen, BackupManager };
}
