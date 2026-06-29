import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { LoadingScreen } from "@/components/loading-screen";
import DashboardPageClient from "./DashboardPageClient";

export const metadata: Metadata = {
  title: "Dashboard Approvazioni | Admin Garage Music Club",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingScreen message="ACCESSO AREA RISERVATA" submessage="Verifica autorizzazioni in corso..." />}>
      <DashboardPageClient />
    </Suspense>
  );
}
