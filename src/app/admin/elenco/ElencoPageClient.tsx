'use client'

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "./AuthGuard";
import { Header } from "@/components/header";
import { Loader2 } from "lucide-react";
import ElencoClient from "./ElencoClient";
import { useFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function ElencoPageClient() {
  const router = useRouter();
  const { auth, user, firestore, isUserLoading } = useFirebase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  const checkAdminStatus = useCallback(async () => {
    if (!user) {
        setIsAdmin(false);
        setIsCheckingAdmin(false);
        return;
    }
    
    setIsCheckingAdmin(true);

    const adminEmail = "garage.music.club2024@gmail.com";
    const emailMatch = user.email?.toLowerCase() === adminEmail.toLowerCase();
    
    if (emailMatch) {
        setIsAdmin(true);
        setIsCheckingAdmin(false);
        return;
    }

    if (firestore) {
        try {
            const adminRef = doc(firestore, "roles_admin", user.uid);
            const adminSnap = await getDoc(adminRef);
            setIsAdmin(adminSnap.exists());
        } catch (e) {
            console.error("Errore verifica admin roles:", e);
            setIsAdmin(false);
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
      signOut(auth).then(() => {
        router.push('/');
      });
      setIsAdmin(false);
    }
  }, [auth, router]);

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header onLogout={isAdmin ? handleLogout : undefined} />
      <main className="flex-grow flex flex-col">
        {isUserLoading || isCheckingAdmin ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div>
                <p className="font-bold text-2xl font-headline tracking-widest text-primary uppercase animate-pulse">Riconoscimento Sistema</p>
                <p className="text-muted-foreground mt-2">Identificazione amministratore GMC in corso...</p>
              </div>
            </div>
          </div>
        ) : (
          <AuthGuard isAdmin={isAdmin}>
            <ElencoClient />
          </AuthGuard>
        )}
      </main>
    </div>
  );
}
