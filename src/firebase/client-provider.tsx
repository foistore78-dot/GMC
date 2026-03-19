'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

/**
 * Fornisce i servizi Firebase garantendo l'inizializzazione stabile sul client.
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<{
    firebaseApp: any;
    auth: any;
    firestore: any;
  }>({
    firebaseApp: null,
    auth: null,
    firestore: null
  });

  useEffect(() => {
    // Inizializzazione sicura al montaggio del componente
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
