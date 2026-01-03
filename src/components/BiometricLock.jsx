"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Fingerprint, Lock, ShieldCheck, AlertCircle } from "lucide-react";
import { useBiometricLock } from "@/hooks/useBiometricLock";

/**
 * BiometricLock wrapper component
 * Shows a lock screen for protected content until user authenticates
 */
export function BiometricLock({ section, children, title = "Protected Content" }) {
  const { canAccess, requestUnlock, isProtected, isBiometricAvailable, isChecking } =
    useBiometricLock();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState(null);

  // If not protected, show content directly
  if (!isProtected(section)) {
    return children;
  }

  // If already unlocked, show content
  if (canAccess(section)) {
    return children;
  }

  // Show loading while checking availability
  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleUnlock = async () => {
    setIsAuthenticating(true);
    setError(null);

    const result = await requestUnlock();

    if (!result.success) {
      setError(result.error || "Authentication failed");
    }

    setIsAuthenticating(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm text-center"
      >
        {/* Lock Icon */}
        <motion.div initial={{ y: -20 }} animate={{ y: 0 }} className="mb-6">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-12 w-12 text-primary" />
          </div>
        </motion.div>

        {/* Title */}
        <h1 className="mb-2 font-heading text-2xl">{title}</h1>
        <p className="mb-8 text-muted-foreground">
          This section is protected. Please authenticate to continue.
        </p>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unlock Button */}
        {isBiometricAvailable ? (
          <motion.button
            onClick={handleUnlock}
            disabled={isAuthenticating}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary py-4 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            whileTap={{ scale: 0.98 }}
          >
            {isAuthenticating ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Authenticating...
              </>
            ) : (
              <>
                <Fingerprint className="h-6 w-6" />
                Unlock with Biometrics
              </>
            )}
          </motion.button>
        ) : (
          <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            <ShieldCheck className="mx-auto mb-2 h-6 w-6 opacity-50" />
            <p>Biometric authentication is not available on this device.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 font-medium text-primary"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Security Note */}
        <p className="mt-6 text-xs text-muted-foreground">
          <ShieldCheck className="mr-1 inline h-3 w-3" />
          Your data is secured with device biometrics
        </p>
      </motion.div>
    </div>
  );
}

export default BiometricLock;
