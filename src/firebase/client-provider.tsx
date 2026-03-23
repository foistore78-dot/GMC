'use client';
import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

const initializedServices = typeof window !== 'undefined' ? initializeFirebase() : { firebaseApp: null, auth: null, firestore: null };

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <FirebaseProvider
      firebaseApp={initializedServices.firebaseApp}
      auth={initializedServices.auth}
      firestore={initializedServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}