"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { RefreshCw, Pencil, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getLocalDate } from "@/lib/date-utils";

/**
 * Collapsible Income Item Component with inline edit form
 */
export function IncomeItem({ item, onUpdate, onDelete, profitMargin = 40 }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editCash, setEditCash] = useState("");
  const [editOnline, setEditOnline] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editIsMonthly, setEditIsMonthly] = useState(false);

  // Get today's date for max validation
  const today = getLocalDate();
  const currentMonth = today.substring(0, 7);

  const cashAmount = Number(item.cashAmount) || 0;
  const onlineAmount = Number(item.onlineAmount) || 0;
  const totalAmount = Number(item.amount) || cashAmount + onlineAmount;
  const profitAmount = Math.round(totalAmount * (profitMargin / 100));

  const startEditing = () => {
    setEditCash(String(item.cashAmount || ""));
    setEditOnline(String(item.onlineAmount || ""));
    setEditDate(item.date);
    setEditIsMonthly(item.type === "monthly");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setIsExpanded(false);
  };

  const handleSave = async () => {
    const cash = Number(editCash) || 0;
    const online = Number(editOnline) || 0;
    const total = cash + online;

    if (total <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    const result = await onUpdate(item.id, {
      cashAmount: cash,
      onlineAmount: online,
      amount: total,
      date: editIsMonthly ? `${editDate.substring(0, 7)}-01` : editDate,
      type: editIsMonthly ? "monthly" : "daily",
    });

    if (result.success) {
      toast.success("Income updated");
      setIsEditing(false);
      setIsExpanded(false);
    } else {
      toast.error(result.error || "Failed to update");
    }
    setIsSubmitting(false);
  };

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-xl bg-muted"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      {/* Main Item Row - Tap to expand/collapse */}
      <motion.div
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center justify-between p-4 transition-colors",
          !isEditing && "cursor-pointer active:bg-accent/50"
        )}
        whileTap={isEditing ? undefined : { scale: 0.98 }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium",
                item.type === "monthly"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted-foreground/20 text-muted-foreground"
              )}
            >
              {item.type === "monthly" ? "Monthly" : "Daily"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.type === "monthly"
              ? format(new Date(item.date), "MMMM yyyy")
              : format(new Date(item.date), "dd MMM yyyy")}
          </p>
          {(cashAmount > 0 || onlineAmount > 0) && (
            <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
              {cashAmount > 0 && <span>₹{cashAmount.toLocaleString("en-IN")} cash</span>}
              {cashAmount > 0 && onlineAmount > 0 && <span>•</span>}
              {onlineAmount > 0 && <span>₹{onlineAmount.toLocaleString("en-IN")} online</span>}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="amount-positive font-mono font-bold">
            +₹{totalAmount.toLocaleString("en-IN")}
          </p>
          <p className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
            Profit: ₹{profitAmount.toLocaleString("en-IN")}
          </p>
        </div>
      </motion.div>

      {/* Expandable Section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {isEditing ? (
              /* Inline Edit Form */
              <div className="space-y-4 border-t border-border/50 p-4">
                {/* Type Toggle */}
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setEditIsMonthly(false)}
                    className={cn(
                      "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
                      !editIsMonthly
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground"
                    )}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditIsMonthly(true)}
                    className={cn(
                      "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
                      editIsMonthly
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground"
                    )}
                  >
                    Monthly
                  </button>
                </div>

                {/* Amount Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Cash ₹</label>
                    <input
                      type="number"
                      value={editCash}
                      onChange={e => setEditCash(e.target.value)}
                      placeholder="0"
                      className="input-hero text-center"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Online ₹</label>
                    <input
                      type="number"
                      value={editOnline}
                      onChange={e => setEditOnline(e.target.value)}
                      placeholder="0"
                      className="input-hero text-center"
                    />
                  </div>
                </div>

                {/* Date Input */}
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Date</label>
                  <input
                    type={editIsMonthly ? "month" : "date"}
                    value={editIsMonthly ? editDate.substring(0, 7) : editDate}
                    onChange={e => {
                      const selectedValue = e.target.value;
                      if (editIsMonthly) {
                        // Prevent future months
                        if (selectedValue > currentMonth) {
                          setEditDate(`${currentMonth}-01`);
                        } else {
                          setEditDate(`${selectedValue}-01`);
                        }
                      } else {
                        // Prevent future dates
                        if (selectedValue > today) {
                          setEditDate(today);
                        } else {
                          setEditDate(selectedValue);
                        }
                      }
                    }}
                    max={editIsMonthly ? currentMonth : today}
                    className="input-hero"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={cancelEditing}
                    disabled={isSubmitting}
                    className="flex-1 rounded-lg bg-background py-2 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Save
                  </button>
                </div>
              </div>
            ) : (
              /* Action Buttons */
              <div className="flex border-t border-border/50">
                <motion.button
                  onClick={e => {
                    e.stopPropagation();
                    startEditing();
                  }}
                  className="flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                  whileTap={{ scale: 0.95 }}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </motion.button>
                <div className="w-px bg-border/50" />
                <motion.button
                  onClick={e => {
                    e.stopPropagation();
                    setIsExpanded(false);
                    onDelete(item);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                  whileTap={{ scale: 0.95 }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default IncomeItem;
