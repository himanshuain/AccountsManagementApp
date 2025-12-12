'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { NavigationProgress } from '@/components/NavigationProgress';
import { GlobalSearch } from '@/components/GlobalSearch';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
      const authed = isAuthenticated();
      if (!authed) {
        router.replace('/login');
      } else {
        setIsAuthed(true);
        setIsChecking(false);
      }
    };
    
    // Small delay to ensure cookies are available after redirect
    const timer = setTimeout(checkAuth, 50);
    return () => clearTimeout(timer);
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <OfflineIndicator />
      <Sidebar />
      <MobileNav />
      
      {/* Main content */}
      <main className="lg:pl-64">
        {/* Search Header */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b lg:border-b-0">
          <div className="hidden lg:block px-6 py-3">
            <GlobalSearch className="max-w-md" />
          </div>
        </div>
        
        <div className="pt-14 lg:pt-0 pb-20 lg:pb-6">
          {children}
        </div>
      </main>
    </div>
  );
}

