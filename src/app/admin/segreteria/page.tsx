import { Suspense } from "react";
import type { Metadata } from "next";
import { LoadingScreen } from "@/components/loading-screen";
import SegreteriaPageClient from "./SegreteriaPageClient";

export const metadata: Metadata = {
  title: "Segreteria | Admin Garage Music Club",
};

export default function SegreteriaPage() {
  return (
    <Suspense fallback={<LoadingScreen message="ACCESSO AREA RISERVATA" submessage="Verifica autorizzazioni in corso..." />}>
      <SegreteriaPageClient />
    </Suspense>
  );
}
