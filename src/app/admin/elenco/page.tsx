'use client'

import { Suspense, useState, useCallback, useEffect } from "react";
import AuthGuard from "./AuthGuard";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Loader2 } from "lucide-react";
import ElencoClient from "./ElencoClient";
import { useFirebase } from "@/firebase";
import { signInAnonymously } from "firebase/auth";

export default function ElencoPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { auth, user, isUserLoading } = useFirebase();

  useEffect(() => {
    if (isUserLoading) return;

    if (!user && auth) {
      signInAnonymously(auth).catch((e) => {
        console.error("Anonymous sign-in failed", e);
        setError("Impossibile connettersi al servizio di autenticazione.");
      });
    }
  }, [user, isUserLoading, auth]);

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('gmc-auth-passed');
    setIsAuthenticated(false);
  }, []);

  const renderContent = () => {
    if (isUserLoading || user === undefined) {
      return (
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Connessione in corso...</p>
        </div>
      );
    }
    
    if (error) {
       return (
        <div className="flex-grow flex items-center justify-center text-center">
          <p className="text-destructive">{error}</p>
        </div>
      );
    }

    return (
      <AuthGuard 
        onLoginSuccess={handleLoginSuccess}
      >
        <ElencoClient />
      </AuthGuard>
    );
  }

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
          {renderContent()}
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
