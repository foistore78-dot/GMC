import { Suspense } from "react";
import ElencoPageClient from "./ElencoPageClient";
import { Loader2 } from "lucide-react";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Elenco Soci | Admin Garage Music Club",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function ElencoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-grow flex items-center justify-center min-h-screen bg-secondary">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      }
    >
      <ElencoPageClient />
    </Suspense>
  );
}