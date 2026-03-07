
'use client'

import { Suspense, useState, useCallback, useEffect } from "react";
import AuthGuard from "./AuthGuard";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Loader2 } from "lucide-react";
import ElencoClient from "./ElencoClient";
import { useFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function ElencoPage() {
  const { auth, user, firestore, isUserLoading } = useFirebase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  const checkAdminStatus = useCallback(async () => {
    setIsCheckingAdmin(true);
    if (user && firestore) {
        // Controllo primario: Email predefinita
        const adminEmail = "garage.music.club2024@gmail.com";
        const emailMatch = user.email?.toLowerCase() === adminEmail.toLowerCase();
        
        if (emailMatch) {
            setIsAdmin(true);
        } else {
            // Controllo secondario: Ruolo salvato nel database
            try {
                const adminRef = doc(firestore, "roles_admin", user.uid);
                const adminSnap = await getDoc(adminRef);
                setIsAdmin(adminSnap.exists());
            } catch (e) {
                console.error("Errore verifica admin roles:", e);
                setIsAdmin(false);
            }
        }
    } else {
        setIsAdmin(false);
    }
    setIsCheckingAdmin(false);
  }, [user, firestore]);
  
  useEffect(() => {
    if (!isUserLoading) {
      checkAdminStatus();
    }
  }, [user, isUserLoading, checkAdminStatus]);


  const handleLogout = useCallback(() => {
    if (auth) {
      signOut(auth);
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
              <p className="text-muted-foreground">Controllo permessi amministratore.</p>
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
