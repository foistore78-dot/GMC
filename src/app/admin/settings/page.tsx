
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { Metadata, Viewport } from "next";
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: "Opzioni | Admin Garage Music Club",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const SettingsPageClient = dynamic(() => import('./SettingsPageClient'), { ssr: false });

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-grow flex items-center justify-center min-h-screen bg-secondary">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      }
    >
      <SettingsPageClient />
    </Suspense>
  );
}
