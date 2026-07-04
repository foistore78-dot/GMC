import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { LoadingScreen } from "@/components/loading-screen";
import FaqPageClient from "./FaqPageClient";

export const metadata: Metadata = {
  title: "Domande Frequenti | Admin Garage Music Club",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function FaqPage() {
  return (
    <Suspense fallback={<LoadingScreen message="ACCESSO AREA RISERVATA" submessage="Caricamento FAQ GMC in corso..." />}>
      <FaqPageClient />
    </Suspense>
  );
}
