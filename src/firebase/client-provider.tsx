'use client';
import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<{
    firebaseApp: any;
    auth: any;
    firestore: any;
  }>({
    firebaseApp: null,
    auth: null,
    firestore: null,
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initialized = initializeFirebase();
    setServices(initialized);
    setMounted(true);
  }, []);

  // Rendiamo il mount più veloce
  if (!mounted) {
    return null;
  }

  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth}
      firestore={services.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}