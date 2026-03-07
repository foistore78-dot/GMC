'use client'

import { Suspense, useState, useCallback, useEffect } from "react";
import AuthGuard from "./AuthGuard";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Loader2 } from "lucide-react";
import ElencoClient from "./ElencoClient";
import { useFirebase } from "@/firebase";
import { signOut } from "firebase/auth";

export default function ElencoPage() {
  const { auth, user, isUserLoading } = useFirebase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  const checkAdminStatus = useCallback(async () => {
    setIsCheckingAdmin(true);
    if (user) {
        // In a real app, you would check a custom claim or a document in Firestore.
        // For this demo, we'll check if the email matches the admin email.
        const adminEmail = "garage.music.club2024@gmail.com";
        setIsAdmin(user.email === adminEmail);
    } else {
        setIsAdmin(false);
    }
    setIsCheckingAdmin(false);
  }, [user]);
  
  useEffect(() => {
    // Only run check when the user loading state is finalized
    if (!isUserLoading) {
      checkAdminStatus();
    }
  }, [user, isUserLoading, checkAdminStatus]);


  const handleLogout = useCallback(() => {
    if (auth) {
      signOut(auth);
      // After sign-out, the AuthGuard will automatically take over.
      // We also reset the local admin state.
      setIsAdmin(false);
    }
  }, [auth]);

  const renderContent = () => {
    if (isUserLoading || isCheckingAdmin) {
      return (
        <div className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div>
              <p className="font-semibold text-lg">Verifica in corso...</p>
              <p className="text-muted-foreground">Connessione ai servizi Firebase.</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <AuthGuard isAdmin={isAdmin}>
        <ElencoClient />
      </AuthGuard>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header onLogout={isAdmin ? handleLogout : undefined} />
      <main className="flex-grow flex flex-col">
        <Suspense
          fallback={
            <div className="flex-grow flex items-center justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
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
