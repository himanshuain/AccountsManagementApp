"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Store, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/PasswordInput";
import { verifyPassword, verifySession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if already authenticated (verify with server)
    const checkAuth = async () => {
      const result = await verifySession();
      if (result.authenticated) {
        router.replace("/");
      } else {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, [router]);

  const handlePasswordSubmit = async pwd => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    const result = await verifyPassword(pwd);

    if (result.success) {
      // Small delay to ensure cookie is set before redirect
      await new Promise(resolve => setTimeout(resolve, 100));
      window.location.href = "/";
    } else {
      setError(result.error || "Invalid password");
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <CardDescription className="mt-2">Enter your password to access</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pb-8 pt-6">
          <div className="space-y-6">
            <PasswordInput
              value={password}
              onChange={setPassword}
              onSubmit={handlePasswordSubmit}
              placeholder="Enter your password"
              error={!!error}
              isLoading={isLoading}
              submitButtonText="Login"
            />

            {error && <p className="animate-shake text-center text-sm text-destructive">{error}</p>}

            <p className="text-center text-xs text-muted-foreground">
              Contact your administrator if you forgot your password
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
