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
    if (!isUserLoading) {
      checkAdminStatus();
    }
  }, [user, isUserLoading, checkAdminStatus]);


  const handleLogout = useCallback(() => {
    if (auth) {
      signOut(auth);
    }
  }, [auth]);

  const renderContent = () => {
    if (isUserLoading || isCheckingAdmin) {
      return (
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Verifica in corso...</p>
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
