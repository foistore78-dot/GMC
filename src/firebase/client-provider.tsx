'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

/**
 * Fornisce i servizi Firebase garantendo l'inizializzazione stabile sul client.
 * Inizializza i servizi immediatamente se siamo in ambiente browser.
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<{
    firebaseApp: any;
    auth: any;
    firestore: any;
  }>(() => {
    // Tentativo di inizializzazione sincrona se siamo sul client
    if (typeof window !== 'undefined') {
      return initializeFirebase();
    }
    return {
      firebaseApp: null,
      auth: null,
      firestore: null
    };
  });

  useEffect(() => {
    // Rafforziamo l'inizializzazione al montaggio
    const initialized = initializeFirebase();
    setServices(initialized);
  }, []);

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