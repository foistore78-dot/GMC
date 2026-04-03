
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { Metadata, Viewport } from "next";
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: "Elenco Soci | Admin Garage Music Club",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

import { LoadingScreen } from "@/components/loading-screen";
import ElencoPageClient from './ElencoPageClient';

export default function ElencoPage() {
  return (
    <Suspense fallback={<LoadingScreen message="ACCESSO AREA RISERVATA" submessage="Verifica autorizzazioni in corso..." />}>
      <ElencoPageClient />
    </Suspense>
  );
}
