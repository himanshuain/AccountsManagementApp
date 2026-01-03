"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Legacy dashboard layout - redirects to new GPay-style layout
 * This layout group is deprecated in favor of the (gpay) route group
 */
export default function LegacyDashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Map old routes to new GPay routes
    const redirectMap = {
      "/": "/", // Home stays at /
      "/suppliers": "/", // Suppliers now in home
      "/customers": "/", // Customers now in home
      "/transactions": "/history", // Transactions -> History
      "/reports": "/settings", // Reports -> Settings (with reports modal)
    };

    // Check for supplier/customer detail pages
    if (pathname.startsWith("/suppliers/")) {
      const id = pathname.split("/").pop();
      router.replace(`/person/supplier/${id}`);
      return;
    }

    // Check for exact matches
    const newPath = redirectMap[pathname];
    if (newPath && pathname !== newPath) {
      router.replace(newPath);
      return;
    }
  }, [pathname, router]);

  // Show nothing during redirect
  return null;
}
