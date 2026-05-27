"use client";

import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-60 min-h-screen">
          <div className="p-8">{children}</div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
