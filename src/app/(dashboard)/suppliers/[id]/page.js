"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

// This page redirects to the new chat view
export default function SupplierDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    // Redirect to chat view
    router.replace(`/chat/supplier/${id}`);
  }, [id, router]);

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}
