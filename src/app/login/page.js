"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Store, Loader2, Fingerprint, KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";
import { verifyPassword, verifySession } from "@/lib/auth";
import { useBiometric } from "@/hooks/useBiometric";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [biometricInProgress, setBiometricInProgress] = useState(false);

  const {
    isSupported: biometricSupported,
    isEnabled: biometricEnabled,
    isLoading: biometricLoading,
    authenticateWithBiometric,
  } = useBiometric();

  useEffect(() => {
    // Check if already authenticated (verify with server)
    const checkAuth = async () => {
      const result = await verifySession();
      if (result.authenticated) {
        router.replace("/");
      } else {
        setIsChecking(false);
        // If biometric not available/enabled, show password directly
        if (!biometricSupported || !biometricEnabled) {
          setShowPasswordInput(true);
        }
      }
    };
    checkAuth();
  }, [router, biometricSupported, biometricEnabled]);

  const handlePasswordSubmit = async (pwd) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    const result = await verifyPassword(pwd);

    if (result.success) {
      // Small delay to ensure cookie is set before redirect
      await new Promise((resolve) => setTimeout(resolve, 100));
      window.location.href = "/";
    } else {
      setError(result.error || "Invalid password");
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (isLoading || biometricLoading || biometricInProgress) return;

    setBiometricInProgress(true);
    setError(null);

    try {
      const result = await authenticateWithBiometric();
      if (result.success) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        window.location.href = "/";
      }
    } catch (err) {
      // If biometric fails, show password input as fallback
      setError("Biometric authentication failed. Please use your password.");
      setShowPasswordInput(true);
      setBiometricInProgress(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show biometric prompt if enabled and not showing password
  const showBiometricPrompt = biometricSupported && biometricEnabled && !showPasswordInput;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-20 dark:opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
      </div>

      <Card className="relative z-10 w-full max-w-md border-border/50 bg-card/80 shadow-2xl backdrop-blur-sm">
        <CardHeader className="space-y-4 pb-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/25">
            <Store className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Shop Manager</CardTitle>
            <CardDescription className="mt-2">
              {showBiometricPrompt
                ? "Tap to use biometrics"
                : "Enter your password to access"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pb-8 pt-6">
          <div className="space-y-6">
            {/* Biometric Prompt - User taps to trigger */}
            {showBiometricPrompt && (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-8">
                  <Button
                    variant="outline"
                    className={cn(
                      "h-28 w-28 rounded-full border-2 transition-all",
                      biometricInProgress 
                        ? "border-primary bg-primary/10" 
                        : "hover:border-primary hover:bg-primary/5 active:scale-95"
                    )}
                    onClick={handleBiometricLogin}
                    disabled={biometricInProgress}
                  >
                    {biometricInProgress ? (
                      <Loader2 className="h-14 w-14 animate-spin text-primary" />
                    ) : (
                      <Fingerprint className="h-14 w-14 text-primary" />
                    )}
                  </Button>
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    {biometricInProgress
                      ? "Place your finger on the sensor..."
                      : "Tap to use Face ID / Touch ID / Fingerprint"}
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setShowPasswordInput(true);
                    setError(null);
                  }}
                  disabled={biometricInProgress}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Use Password Instead
                </Button>
              </div>
            )}

            {/* Password Input */}
            {showPasswordInput && (
              <>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  onSubmit={handlePasswordSubmit}
                  placeholder="Enter your password"
                  error={!!error}
                  isLoading={isLoading}
                  submitButtonText="Login"
                />

                {/* Show biometric option if available */}
                {biometricSupported && biometricEnabled && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setShowPasswordInput(false);
                      setError(null);
                      setPassword("");
                    }}
                    disabled={isLoading}
                  >
                    <Fingerprint className="mr-2 h-4 w-4" />
                    Use Biometrics Instead
                  </Button>
                )}
              </>
            )}

            {error && (
              <p className="animate-shake text-center text-sm text-destructive">{error}</p>
            )}

            <p className="text-center text-xs text-muted-foreground">
              Contact your administrator if you forgot your password
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
