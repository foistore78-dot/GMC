'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [services, setServices] = useState<FirebaseServices | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Attempt initialization on client mount
    const firebaseServices = initializeFirebase();
    if (firebaseServices) {
      setServices(firebaseServices);
      setError(null);
    } else {
      // If we are on the client and it still fails, it's a configuration issue
      if (typeof window !== 'undefined') {
        setError("Impossibile connettersi ai servizi Firebase. Verifica la configurazione.");
      }
    }
    setIsInitializing(false);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 text-white">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          <div className="bg-destructive/20 p-4 rounded-full border border-destructive/50">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-headline text-primary">Errore di Connessione</h2>
            <p className="text-muted-foreground text-sm">
              Non è stato possibile caricare i servizi necessari. Ricarica la pagina per riprovare.
            </p>
          </div>
          <Button onClick={() => window.location.reload()} variant="outline" className="w-full gap-2 border-primary/20 hover:bg-primary/10">
            <RefreshCw className="h-4 w-4" /> Ricarica Applicazione
          </Button>
        </div>
      </div>
    );
  }

  if (isInitializing || !services) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="space-y-1">
            <p className="font-headline text-lg tracking-widest text-primary">GARAGE MUSIC CLUB</p>
            <p className="text-xs text-muted-foreground animate-pulse uppercase">
              Inizializzazione in corso...
            </p>
          </div>
        </div>
      </div>
    );
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
