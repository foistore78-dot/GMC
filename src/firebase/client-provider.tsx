'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

/**
 * Wrapper for FirebaseProvider that ensures services are only initialized
 * once during the application's lifecycle on the client.
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  // Use useMemo to ensure initializeFirebase is only called once per mount.
  // This is safe because initializeFirebase itself handles the singleton logic.
  const services = useMemo(() => initializeFirebase(), []);

  // If we're on the server or services failed to initialize,
  // we still render the children but the provider state will reflect the unavailability.
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
