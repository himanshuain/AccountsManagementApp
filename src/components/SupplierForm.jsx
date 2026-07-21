"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Contact, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DragCloseDrawer } from "@/components/ui/drag-close-drawer";
import {
  FormSection,
  FormDrawerHeader,
  OfflineBanner,
  FormSubmitButton,
  NO_SPIN_INPUT,
} from "@/components/form/FormDrawerUI";
import { ImageUpload } from "./ImageUpload";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { useContactPicker } from "@/hooks/useContactPicker";
import {
  addSessionStorageKeys,
  clearSessionStorageKeys,
  deleteStorageKeysClient,
  drainSessionStorageKeysForCancel,
  removeSessionStorageKeys,
} from "@/lib/orphan-upload-cleanup";

export function SupplierForm({
  open,
  onOpenChange,
  onSubmit,
  initialData = null,
  title = "Add Supplier",
}) {
  const isOnline = useOnlineStatus();
  const { isSupported: contactPickerSupported, isPicking, pickContact } = useContactPicker();
  const sessionUploadKeysRef = useRef(new Set());
  const sessionScopeRef = useRef("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePicture, setProfilePicture] = useState(initialData?.profilePicture || null);
  const [upiQrCode, setUpiQrCode] = useState(initialData?.upiQrCode || null);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingUpiQr, setUploadingUpiQr] = useState(false);

  const defaultFormValues = {
    companyName: "",
    name: "",
    phone: "",
    address: "",
    gstNumber: "",
    upiId: "",
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

  // Update form when dialog opens
  useEffect(() => {
    if (open) {
      if (initialData) {
        // Editing - populate with existing data
        setProfilePicture(initialData.profilePicture || null);
        setUpiQrCode(initialData.upiQrCode || null);
        reset({
          companyName: initialData.companyName || "",
          name: initialData.name || "",
          phone: initialData.phone || "",
          address: initialData.address || "",
          gstNumber: initialData.gstNumber || "",
          upiId: initialData.upiId || "",
        });
      } else {
        // Adding new - reset to empty
        setProfilePicture(null);
        setUpiQrCode(null);
        reset(defaultFormValues);
      }
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = async data => {
    if (!isOnline) return;
    if (uploadingProfile || uploadingUpiQr) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        profilePicture,
        upiQrCode,
      });
      clearSessionStorageKeys(sessionUploadKeysRef);
      reset();
      setProfilePicture(null);
      setUpiQrCode(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Submit failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDirty = () => {
    if (isDirty) return true;
    if (profilePicture !== (initialData?.profilePicture || null)) return true;
    if (upiQrCode !== (initialData?.upiQrCode || null)) return true;
    return false;
  };

  const resetAndClose = () => {
    deleteStorageKeysClient(drainSessionStorageKeysForCancel(sessionUploadKeysRef));
    reset();
    setProfilePicture(initialData?.profilePicture || null);
    setUpiQrCode(initialData?.upiQrCode || null);
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

  const canSubmit = !isSubmitting && isOnline && !uploadingProfile && !uploadingUpiQr;
  const submitLabel = initialData ? "Save supplier" : "Add supplier";

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
        icon={Store}
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
            attachHint="Supplier shop or contact photo"
            aspectRatio="square"
            disabled={!isOnline}
            onUploadingChange={setUploadingProfile}
            onSessionStorageKeysAdded={keys => addSessionStorageKeys(sessionUploadKeysRef, keys)}
            onSessionStorageKeysRemoved={keys =>
              removeSessionStorageKeys(sessionUploadKeysRef, keys)
            }
            folder="suppliers"
          />
        </FormSection>

        <FormSection title="Basic details">
          <div className="space-y-3">
            <div>
              <label
                htmlFor="companyName"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Supplier name *
              </label>
              <input
                id="companyName"
                {...register("companyName", {
                  required: "Supplier name is required",
                })}
                placeholder="Enter supplier/shop name"
                className="input-hero h-12 text-base"
              />
              {errors.companyName && (
                <p className="mt-1.5 text-xs text-destructive">{errors.companyName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  Contact person
                </label>
                <input
                  id="name"
                  {...register("name")}
                  placeholder="Person name"
                  className="input-hero h-12"
                />
              </div>
              <div>
                <label
                  htmlFor="phone"
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  Phone
                </label>
                <div className="flex gap-1">
                  <input
                    id="phone"
                    {...register("phone")}
                    placeholder="Phone"
                    type="tel"
                    inputMode="tel"
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
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Contact className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="UPI payment"
          className="border-sky-500/30 bg-sky-500/[0.06]"
        >
          <div className="space-y-3">
            <div>
              <label
                htmlFor="upiId"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                UPI ID
              </label>
              <input
                id="upiId"
                {...register("upiId")}
                placeholder="example@upi or 9876543210@paytm"
                className="input-hero h-12 text-base"
              />
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">QR code photo</p>
              <ImageUpload
                value={upiQrCode}
                onChange={setUpiQrCode}
                layout="hero"
                attachLabel="Attach QR code"
                attachHint="Photo of supplier UPI QR"
                aspectRatio="square"
                disabled={!isOnline}
                onUploadingChange={setUploadingUpiQr}
                onSessionStorageKeysAdded={keys =>
                  addSessionStorageKeys(sessionUploadKeysRef, keys)
                }
                onSessionStorageKeysRemoved={keys =>
                  removeSessionStorageKeys(sessionUploadKeysRef, keys)
                }
                folder="qr-codes"
              />
            </div>
          </div>
        </FormSection>

        <FormSection title="Additional">
          <div className="space-y-3">
            <div>
              <label
                htmlFor="address"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Address
              </label>
              <input
                id="address"
                {...register("address")}
                placeholder="Full address"
                className="input-hero h-12"
              />
            </div>

            <div>
              <label
                htmlFor="gstNumber"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                GST number
              </label>
              <input
                id="gstNumber"
                {...register("gstNumber")}
                placeholder="GST number (optional)"
                className="input-hero h-12"
              />
            </div>
          </div>
        </FormSection>

        <FormSubmitButton disabled={!canSubmit} isSubmitting={isSubmitting}>
          {submitLabel}
        </FormSubmitButton>
      </form>
    </DragCloseDrawer>
  );
}

export default SupplierForm;
