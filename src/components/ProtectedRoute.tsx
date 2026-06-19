"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, initialized, router]);

  // Still checking localStorage — render nothing, no redirect yet
  if (!initialized) return null;

  // Check done, not logged in — redirect is already in flight
  if (!isAuthenticated) return null;

  return <>{children}</>;
}
