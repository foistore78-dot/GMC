'use client'

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../elenco/AuthGuard";
import { Header } from "@/components/header";
import { LoadingScreen } from "@/components/loading-screen";
import SegreteriaClient from "./SegreteriaClient";
import { useFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function SegreteriaPageClient() {
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
    
    const sessionKey = `gmc_is_admin_${user.uid}`;
    const cached = typeof window !== 'undefined' ? sessionStorage.getItem(sessionKey) : null;
    if (cached !== null) {
        setIsAdmin(cached === 'true');
        setIsCheckingAdmin(false);
        return;
    }

    setIsCheckingAdmin(true);

    const adminEmail = "garage.music.club2024@gmail.com";
    const emailMatch = user.email?.toLowerCase() === adminEmail.toLowerCase();
    
    if (emailMatch) {
        setIsAdmin(true);
        if (typeof window !== 'undefined') sessionStorage.setItem(sessionKey, 'true');
        setIsCheckingAdmin(false);
        return;
    }

    if (firestore) {
        try {
            const adminRef = doc(firestore, "roles_admin", user.uid);
            const adminSnap = await getDoc(adminRef);
            const hasRole = adminSnap.exists();
            setIsAdmin(hasRole);
            if (typeof window !== 'undefined') sessionStorage.setItem(sessionKey, String(hasRole));
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
      if (user) {
        const sessionKey = `gmc_is_admin_${user.uid}`;
        const cached = typeof window !== 'undefined' ? sessionStorage.getItem(sessionKey) : null;
        if (cached !== null) {
          setIsAdmin(cached === 'true');
          setIsCheckingAdmin(false);
          return;
        }
      }
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
    <div className="flex flex-col min-h-screen bg-secondary print:bg-white print:min-h-0">
      <div className="print:hidden">
        <Header onLogout={isAdmin ? handleLogout : undefined} />
      </div>
      <main className="flex-grow flex flex-col print:block print:bg-white">
        {isUserLoading || isCheckingAdmin ? (
          <LoadingScreen 
            fullScreen={false} 
            message="RICONOSCIMENTO SISTEMA" 
            submessage="Identificazione amministratore GMC in corso..." 
          />
        ) : (
          <AuthGuard isAdmin={isAdmin}>
            <SegreteriaClient />
          </AuthGuard>
        )}
      </main>
    </div>
  );
}
