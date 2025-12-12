'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PinInput } from '@/components/PinInput';
import { verifyPin, isAuthenticated } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    if (isAuthenticated()) {
      router.replace('/');
    } else {
      setIsChecking(false);
    }
  }, [router]);

  const handlePinComplete = async (pin) => {
    if (isLoading) return; // Prevent double submission
    
    setIsLoading(true);
    setError(false);

    const result = await verifyPin(pin);

    if (result.success) {
      // Small delay to ensure cookie is set before redirect
      await new Promise(resolve => setTimeout(resolve, 100));
      window.location.href = '/'; // Use window.location for full page reload
    } else {
      setError(true);
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-20 dark:opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Store className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Shop Manager</CardTitle>
            <CardDescription className="mt-2">
              Enter your 6-digit PIN to access
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6 pb-8">
          <div className="space-y-6">
            <PinInput 
              length={6} 
              onComplete={handlePinComplete} 
              error={error}
            />
            
            {error && (
              <p className="text-center text-sm text-destructive animate-shake">
                Invalid PIN. Please try again.
              </p>
            )}

            {isLoading && (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              Contact your administrator if you forgot your PIN
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
