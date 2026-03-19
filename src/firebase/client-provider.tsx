'use client';
import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initialized = initializeFirebase();
    setServices(initialized);
  }, []);

  // Evita flash di contenuto o pagina nera durante l'idratazione
  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <FirebaseProvider
      firebaseApp={services?.firebaseApp || null}
      auth={services?.auth || null}
      firestore={services?.firestore || null}
    >
      {children}
    </FirebaseProvider>
  );
}
