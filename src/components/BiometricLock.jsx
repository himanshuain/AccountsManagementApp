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
  const { canAccess, requestUnlock, isProtected, isBiometricAvailable, isChecking } = useBiometricLock();
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm text-center"
      >
        {/* Lock Icon */}
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="mb-6"
        >
          <div className="h-24 w-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-12 w-12 text-primary" />
          </div>
        </motion.div>

        {/* Title */}
        <h1 className="text-2xl font-heading mb-2">{title}</h1>
        <p className="text-muted-foreground mb-8">
          This section is protected. Please authenticate to continue.
        </p>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-destructive/10 text-destructive rounded-xl flex items-center gap-2 text-sm"
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
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-medium flex items-center justify-center gap-3 hover:opacity-90 transition-opacity disabled:opacity-50"
            whileTap={{ scale: 0.98 }}
          >
            {isAuthenticating ? (
              <>
                <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
          <div className="p-4 bg-muted rounded-xl text-muted-foreground text-sm">
            <ShieldCheck className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p>Biometric authentication is not available on this device.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-primary font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Security Note */}
        <p className="mt-6 text-xs text-muted-foreground">
          <ShieldCheck className="h-3 w-3 inline mr-1" />
          Your data is secured with device biometrics
        </p>
      </motion.div>
    </div>
  );
}

export default BiometricLock;

