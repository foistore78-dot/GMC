
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

import SettingsPageClient from './SettingsPageClient';
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-screen bg-secondary">
          <Header />
          <main className="flex-grow flex items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </main>
          <Footer />
        </div>
      }
    >
      <SettingsPageClient />
    </Suspense>
  );
}
