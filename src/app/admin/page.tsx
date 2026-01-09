"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function AdminRedirectPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        // If user is logged in, redirect them to the new main dashboard.
        router.replace('/dashboard');
      } else {
        // If user is not logged in, send them to the login page.
        router.replace('/login');
      }
    }
  }, [user, isUserLoading, router]);

  // While checking auth state or redirecting, show a full-page loader.
  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header />
      <main className="flex-grow flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Caricamento in corso...</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
