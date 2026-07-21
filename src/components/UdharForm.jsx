"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { BookOpen, Users, IndianRupee, Calendar, StickyNote } from "lucide-react";
import { Autocomplete, TextField, Avatar } from "@mui/material";
import { DragCloseDrawer } from "@/components/ui/drag-close-drawer";
import { MultiImageUpload } from "./ImageUpload";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { CustomerForm } from "./CustomerForm";
import { resolveImageUrl } from "@/lib/image-url";
import {
  FormSection,
  FormDrawerHeader,
  OfflineBanner,
  FormSubmitButton,
  MUI_AUTOCOMPLETE_SX,
  AUTOCOMPLETE_POPPER_PROPS,
  NO_SPIN_INPUT,
} from "@/components/form/FormDrawerUI";
import {
  addSessionStorageKeys,
  clearSessionStorageKeys,
  deleteStorageKeysClient,
  drainSessionStorageKeysForCancel,
  removeSessionStorageKeys,
} from "@/lib/orphan-upload-cleanup";

export function UdharForm({
  open,
  onOpenChange,
  onSubmit,
  onAddCustomer,
  customers = [],
  initialData = null,
  defaultCustomerId = null,
  defaultCustomerName = null,
  autoOpenCustomerDropdown = false,
  title = "Add Udhar",
}) {
  const isOnline = useOnlineStatus();
  const sessionUploadKeysRef = useRef(new Set());
  const sessionScopeRef = useRef("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [khataPhotos, setKhataPhotos] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(defaultCustomerId || "");
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [isUploadingKhata, setIsUploadingKhata] = useState(false);

  // Get today's date in local timezone (YYYY-MM-DD format)
  const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const defaultFormValues = {
    date: getLocalDate(),
    amount: "",
    notes: "",
    itemDescription: "",
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (!open) {
      sessionScopeRef.current = "";
      return;
    }
    const scope = String(initialData?.id ?? "new");
    if (sessionScopeRef.current !== scope) {
      sessionScopeRef.current = scope;
      sessionUploadKeysRef.current.clear();
    }
  }, [open, initialData?.id]);

  // Handle initialData changes - separate effect for better reactivity
  useEffect(() => {
    if (open && initialData) {
      // Set khataPhotos from initialData
      if (initialData.khataPhotos && initialData.khataPhotos.length > 0) {
        setKhataPhotos(initialData.khataPhotos);
      }
      if (initialData.customerId) {
        setSelectedCustomerId(initialData.customerId);
      }
      // Calculate total from old cash+online or use amount directly
      const totalAmount =
        initialData.amount || (initialData.cashAmount || 0) + (initialData.onlineAmount || 0);
      reset({
        date: initialData.date || getLocalDate(),
        amount: totalAmount || "",
        notes: initialData.notes || "",
        itemDescription: initialData.itemDescription || "",
      });
    }
  }, [open, initialData, reset]);

  // Reset form state when opening without initialData
  useEffect(() => {
    if (open && !initialData) {
      setKhataPhotos([]);
      setSelectedCustomerId(defaultCustomerId || "");
      reset(defaultFormValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultCustomerId]);

  // Helper function to convert base64 data URL to File
  const base64ToFile = (dataUrl, filename) => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleFormSubmit = async data => {
    if (!selectedCustomerId) {
      return;
    }
    if (!isOnline) return;
    if (isUploadingKhata) return;

    setIsSubmitting(true);
    try {
      // Upload any base64 images that haven't been uploaded yet
      let uploadedPhotos = [];
      for (let i = 0; i < khataPhotos.length; i++) {
        const photo = khataPhotos[i];
        if (photo.startsWith("data:")) {
          // Base64 data URL - needs uploading
          try {
            const file = base64ToFile(photo, `khata-${Date.now()}-${i}.jpg`);
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/upload", {
              method: "POST",
              body: formData,
            });

            if (response.ok) {
              const { url } = await response.json();
              uploadedPhotos.push(url);
            } else {
              console.error("Failed to upload khata image");
            }
          } catch (error) {
            console.error("Khata image upload failed:", error);
          }
        } else {
          // Already a URL, keep it
          uploadedPhotos.push(photo);
        }
      }

      await onSubmit({
        ...data,
        customerId: selectedCustomerId,
        khataPhotos: uploadedPhotos,
        amount: Number(data.amount) || 0,
        // Keep for backward compatibility
        cashAmount: Number(data.amount) || 0,
        onlineAmount: 0,
      });
      clearSessionStorageKeys(sessionUploadKeysRef);
      reset();
      setKhataPhotos([]);
      setSelectedCustomerId(defaultCustomerId || "");
      onOpenChange(false);
    } catch (error) {
      console.error("Submit failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDirty = () => {
    if (isDirty) return true;
    const original = initialData?.khataPhotos || [];
    if (khataPhotos.length !== original.length) return true;
    return khataPhotos.some((img, i) => img !== original[i]);
  };

  const resetAndClose = () => {
    const initialKhata = initialData?.khataPhotos || [];
    deleteStorageKeysClient(drainSessionStorageKeysForCancel(sessionUploadKeysRef));
    reset();
    setKhataPhotos(initialKhata);
    setSelectedCustomerId(initialData?.customerId || defaultCustomerId || "");
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      if (isFormDirty()) {
        if (!confirm("You have unsaved changes. Are you sure you want to close?")) {
          return;
        }
      }
      resetAndClose();
    }
  };

  const handleBeforeClose = async () => {
    if (isSubmitting) return false;
    if (!isFormDirty()) return true;
    return confirm("You have unsaved changes. Are you sure you want to close?");
  };

  const handleNewCustomer = async customerData => {
    const result = await onAddCustomer(customerData);
    if (result.success) {
      setSelectedCustomerId(result.data.id);
      setCustomerFormOpen(false);
    }
    return result;
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || null;
  const contextCustomerLabel = selectedCustomer?.name || defaultCustomerName || null;
  const isCustomerLocked = !!defaultCustomerId;
  const formTitle = initialData ? "Edit Udhar" : title;
  const submitLabel = initialData ? "Save changes" : "Add udhar";
  const canSubmit = !isSubmitting && !!selectedCustomerId && isOnline && !isUploadingKhata;

  return (
    <>
      <DragCloseDrawer
        open={open}
        onOpenChange={v => {
          if (!v) resetAndClose();
        }}
        beforeClose={handleBeforeClose}
        height="h-[92vh]"
      >
        <FormDrawerHeader
          title={formTitle}
          icon={BookOpen}
          subtitle={isCustomerLocked ? contextCustomerLabel : undefined}
          onClose={handleClose}
          onSubmit={handleSubmit(handleFormSubmit)}
          isSubmitting={isSubmitting}
          isEdit={!!initialData}
          canSubmit={canSubmit}
        />

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 px-4 py-4 pb-8">
          {!isOnline && <OfflineBanner />}

          <div className="space-y-2">
            <p className="px-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Khata photos
            </p>
            <MultiImageUpload
              value={khataPhotos}
              onChange={setKhataPhotos}
              maxImages={5}
              disabled={!isOnline}
              layout="hero"
              attachLabel="Attach khata photos"
              onUploadingChange={setIsUploadingKhata}
              onSessionStorageKeysAdded={keys => addSessionStorageKeys(sessionUploadKeysRef, keys)}
              onSessionStorageKeysRemoved={keys =>
                removeSessionStorageKeys(sessionUploadKeysRef, keys)
              }
              folder="khata"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-4 shadow-sm">
            <label
              htmlFor="amount"
              className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Amount (₹) *
            </label>
            <div className="relative">
              <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-amber-600/70 dark:text-amber-400/70" />
              <input
                id="amount"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                {...register("amount", { required: "Amount is required" })}
                placeholder="0"
                disabled={!isOnline}
                className={`input-hero h-14 pl-12 font-mono text-3xl font-bold tabular-nums tracking-tight ${NO_SPIN_INPUT}`}
              />
            </div>
            {errors.amount && (
              <p className="mt-2 text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {!isCustomerLocked && (
            <FormSection title="Customer" icon={Users}>
              <div className="rounded-xl bg-muted/50 px-1 py-0.5">
                <Autocomplete
                  options={customers}
                  value={selectedCustomer}
                  onChange={(_, newValue) => setSelectedCustomerId(newValue?.id || "")}
                  disabled={!isOnline}
                  getOptionLabel={opt => opt?.name || ""}
                  isOptionEqualToValue={(option, value) => option?.id === value?.id}
                  renderInput={params => (
                    <TextField
                      {...params}
                      placeholder="Search customer…"
                      required
                      variant="outlined"
                      sx={MUI_AUTOCOMPLETE_SX}
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <li {...otherProps} key={option.id}>
                        <div className="flex w-full items-center gap-3">
                          <Avatar
                            src={resolveImageUrl(option.profilePicture)}
                            alt={option.name}
                            sx={{ width: 32, height: 32 }}
                          >
                            {(option.name || "").charAt(0).toUpperCase()}
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{option.name}</div>
                            {option.phone && (
                              <div className="text-xs opacity-70">{option.phone}</div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  }}
                  noOptionsText="No customer found"
                  fullWidth
                  slotProps={AUTOCOMPLETE_POPPER_PROPS}
                />
              </div>
              {!selectedCustomerId && (
                <p className="mt-2 text-xs text-destructive">Select a customer to continue</p>
              )}
            </FormSection>
          )}

          <FormSection title="Details" icon={Calendar}>
            <div>
              <label
                htmlFor="date"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Udhari date *
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="date"
                  type="date"
                  {...register("date", {
                    required: "Date is required",
                    validate: value => {
                      const today = getLocalDate();
                      if (value > today) return "Future dates are not allowed";
                      return true;
                    },
                  })}
                  onChange={e => {
                    const today = getLocalDate();
                    if (e.target.value > today) {
                      e.target.value = today;
                    }
                  }}
                  disabled={!isOnline}
                  max={new Date().toISOString().split("T")[0]}
                  className="input-hero h-11 pr-10 text-sm"
                />
              </div>
              {errors.date && (
                <p className="mt-1 text-[10px] text-destructive">{errors.date.message}</p>
              )}
            </div>
          </FormSection>

          <FormSection title="Description" icon={StickyNote} className="[&>div:last-child]:py-3">
            <textarea
              id="notes"
              rows={2}
              {...register("notes")}
              placeholder="Add any details about this udhar…"
              disabled={!isOnline}
              className="input-hero min-h-[72px] resize-none py-2.5 text-sm leading-relaxed"
            />
          </FormSection>

          <FormSubmitButton disabled={!canSubmit} isSubmitting={isSubmitting}>
            {submitLabel}
          </FormSubmitButton>
        </form>
      </DragCloseDrawer>

      <CustomerForm
        open={customerFormOpen}
        onOpenChange={setCustomerFormOpen}
        onSubmit={handleNewCustomer}
        title="Add New Customer"
      />
    </>
  );
}

export default UdharForm;
