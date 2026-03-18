
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

const ElencoPageClient = dynamic(() => import('./ElencoPageClient'), { ssr: false });

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
