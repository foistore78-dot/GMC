
'use client'

import { Suspense, useState, useCallback } from "react";
import AuthGuard from "./AuthGuard";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Loader2 } from "lucide-react";
import ElencoClient from "./ElencoClient";

export default function ElencoPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('gmc-auth-passed');
    setIsAuthenticated(false);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header onLogout={isAuthenticated ? handleLogout : undefined} />
      <main className="flex-grow flex flex-col">
        <Suspense
          fallback={
            <div className="flex-grow flex items-center justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Caricamento...</p>
            </div>
          }
        >
          <AuthGuard 
            isAuthenticated={isAuthenticated} 
            setIsAuthenticated={setIsAuthenticated} 
            onLoginSuccess={handleLoginSuccess}
          >
            <ElencoClient />
          </AuthGuard>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
