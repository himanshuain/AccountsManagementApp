"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Contact, User, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DragCloseDrawer } from "@/components/ui/drag-close-drawer";
import { ImageUpload } from "./ImageUpload";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { useContactPicker } from "@/hooks/useContactPicker";
import {
  FormSection,
  FormDrawerHeader,
  OfflineBanner,
  FormSubmitButton,
  NO_SPIN_INPUT,
} from "@/components/form/FormDrawerUI";
import {
  addSessionStorageKeys,
  clearSessionStorageKeys,
  deleteStorageKeysClient,
  drainSessionStorageKeysForCancel,
  removeSessionStorageKeys,
} from "@/lib/orphan-upload-cleanup";

export function CustomerForm({
  open,
  onOpenChange,
  onSubmit,
  initialData = null,
  title = "Add Customer",
  showInitialAmount = false,
  initialAmount = "",
  onInitialAmountChange = () => {},
}) {
  const isOnline = useOnlineStatus();
  const { isSupported: contactPickerSupported, isPicking, pickContact } = useContactPicker();
  const sessionUploadKeysRef = useRef(new Set());
  const sessionScopeRef = useRef("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePicture, setProfilePicture] = useState(initialData?.profilePicture || null);
  const [khataPhotos, setKhataPhotos] = useState(
    initialData?.khataPhotos || (initialData?.khataPhoto ? [initialData.khataPhoto] : [])
  );
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingKhata, setUploadingKhata] = useState(false);

  const defaultFormValues = {
    name: "",
    phone: "",
    address: "",
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: defaultFormValues,
  });

  // Handle contact picker selection
  const handlePickContact = async () => {
    const contact = await pickContact();
    if (contact) {
      if (contact.phone) {
        setValue("phone", contact.phone, { shouldDirty: true });
      }
      // Optionally fill name if empty
      if (contact.name) {
        const currentName = document.getElementById("name")?.value;
        if (!currentName) {
          setValue("name", contact.name, { shouldDirty: true });
        }
      }
    }
  };

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

  useEffect(() => {
    if (open) {
      if (initialData) {
        setProfilePicture(initialData.profilePicture || null);
        setKhataPhotos(
          initialData.khataPhotos || (initialData.khataPhoto ? [initialData.khataPhoto] : [])
        );
        reset({
          name: initialData.name || "",
          phone: initialData.phone || "",
          address: initialData.address || "",
        });
      } else {
        setProfilePicture(null);
        setKhataPhotos([]);
        reset(defaultFormValues);
      }
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = async data => {
    if (!isOnline) return;
    if (uploadingProfile || uploadingKhata) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        profilePicture,
        khataPhotos,
      });
      clearSessionStorageKeys(sessionUploadKeysRef);
      reset();
      setProfilePicture(null);
      setKhataPhotos([]);
      onOpenChange(false);
    } catch (error) {
      console.error("Submit failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitialKhataPhotos = () =>
    initialData?.khataPhotos || (initialData?.khataPhoto ? [initialData.khataPhoto] : []);

  const isFormDirty = () => {
    if (isDirty) return true;
    if (profilePicture !== (initialData?.profilePicture || null)) return true;
    if (JSON.stringify(khataPhotos) !== JSON.stringify(getInitialKhataPhotos())) return true;
    return false;
  };

  const resetAndClose = () => {
    const initialKhata = getInitialKhataPhotos();
    deleteStorageKeysClient(drainSessionStorageKeysForCancel(sessionUploadKeysRef));
    reset();
    setProfilePicture(initialData?.profilePicture || null);
    setKhataPhotos(initialKhata);
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

  const canSubmit = !isSubmitting && isOnline && !uploadingProfile && !uploadingKhata;
  const submitLabel = initialData ? "Save changes" : "Add customer";

  return (
    <DragCloseDrawer
      open={open}
      onOpenChange={v => {
        if (!v) resetAndClose();
      }}
      beforeClose={handleBeforeClose}
      height="h-[92vh]"
    >
      <FormDrawerHeader
        title={title}
        icon={User}
        onClose={handleClose}
        onSubmit={handleSubmit(handleFormSubmit)}
        isSubmitting={isSubmitting}
        isEdit={!!initialData}
        canSubmit={canSubmit}
      />

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 px-4 py-4 pb-8">
        {!isOnline && <OfflineBanner />}

        <FormSection title="Photo">
          <ImageUpload
            value={profilePicture}
            onChange={setProfilePicture}
            layout="hero"
            attachLabel="Add profile photo"
            attachHint="Customer photo (optional)"
            aspectRatio="square"
            disabled={!isOnline}
            onUploadingChange={setUploadingProfile}
            onSessionStorageKeysAdded={keys => addSessionStorageKeys(sessionUploadKeysRef, keys)}
            onSessionStorageKeysRemoved={keys =>
              removeSessionStorageKeys(sessionUploadKeysRef, keys)
            }
            folder="customers"
          />
        </FormSection>

        <FormSection title="Basic details">
          <div className="space-y-3">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Customer name *
              </label>
              <input
                id="name"
                {...register("name", {
                  required: "Customer name is required",
                })}
                placeholder="Enter customer name"
                className="input-hero h-12 text-base"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Phone number
              </label>
              <div className="flex gap-2">
                <input
                  id="phone"
                  {...register("phone")}
                  placeholder="Phone number"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={`input-hero h-12 flex-1 text-base ${NO_SPIN_INPUT}`}
                />
                {contactPickerSupported && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 shrink-0"
                    onClick={handlePickContact}
                    disabled={isPicking || !isOnline}
                    title="Pick from contacts"
                  >
                    {isPicking ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Contact className="h-5 w-5" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </FormSection>

        {showInitialAmount && (
          <div className="overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-4 shadow-sm">
            <label
              htmlFor="initialAmount"
              className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Initial Udhar Amount (₹)
            </label>
            <div className="relative">
              <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-amber-600/70 dark:text-amber-400/70" />
              <input
                id="initialAmount"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={initialAmount}
                onChange={e => onInitialAmountChange(e.target.value)}
                placeholder="0"
                className={`input-hero h-14 pl-12 text-2xl font-bold tabular-nums tracking-tight ${NO_SPIN_INPUT}`}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              This will create an Udhar entry automatically
            </p>
          </div>
        )}

        <FormSection title="Address">
          <input
            id="address"
            {...register("address")}
            placeholder="Full address"
            className="input-hero h-12 text-base"
          />
        </FormSection>

        {/* Khata Photos
        <FormSection title="Khata photos">
          <MultiImageUpload
            value={khataPhotos}
            onChange={setKhataPhotos}
            maxImages={5}
            disabled={!isOnline}
            onUploadingChange={setUploadingKhata}
            folder="khata"
          />
        </FormSection> */}

        <FormSubmitButton disabled={!canSubmit} isSubmitting={isSubmitting}>
          {submitLabel}
        </FormSubmitButton>
      </form>
    </DragCloseDrawer>
  );
}

export default CustomerForm;
