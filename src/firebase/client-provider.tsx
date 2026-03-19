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
  }>(() => {
    if (typeof window !== 'undefined') {
      return initializeFirebase();
    }
    return { firebaseApp: null, auth: null, firestore: null };
  });

  useEffect(() => {
    // Se per qualche motivo i servizi non sono stati caricati (es. hydration rapida), riproviamo.
    if (!services.firebaseApp && typeof window !== 'undefined') {
      const initialized = initializeFirebase();
      setServices(initialized);
    }
  }, [services.firebaseApp]);

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