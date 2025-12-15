"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

// This page redirects to the main suppliers page with the drawer open
// This ensures consistency in the UI - all supplier profiles are viewed via the drawer
export default function SupplierDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    // Redirect to main suppliers page with drawer open
    router.replace(`/suppliers?open=${id}`);
  }, [id, router]);

  // Show nothing while redirecting
  return null;
}
