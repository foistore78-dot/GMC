"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../elenco/AuthGuard";
import { Header } from "@/components/header";
import { LoadingScreen } from "@/components/loading-screen";
import DashboardClient from "./DashboardClient";
import { useFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { BuildFooter } from "@/components/build-footer";

export default function DashboardPageClient() {
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
          <LoadingScreen 
            fullScreen={false} 
            message="RICONOSCIMENTO SISTEMA" 
            submessage="Identificazione amministratore GMC in corso..." 
          />
        ) : (
          <AuthGuard isAdmin={isAdmin}>
            <DashboardClient />
          </AuthGuard>
        )}
      </main>
      <BuildFooter />
    </div>
  );
}
