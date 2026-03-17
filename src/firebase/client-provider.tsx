'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { Loader2, AlertCircle, RefreshCcw } from 'lucide-react';
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
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const firebaseServices = initializeFirebase();
    if (firebaseServices) {
      setServices(firebaseServices);
    } else {
      // Inizializzazione fallita
      setError(true);
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="space-y-2">
            <h2 className="text-xl font-headline text-primary">Errore di Connessione</h2>
            <p className="text-sm text-muted-foreground">
              Impossibile connettersi ai servizi del Club. Verifica la tua connessione o riprova.
            </p>
          </div>
          <Button onClick={() => window.location.reload()} variant="outline" className="gap-2">
            <RefreshCcw className="h-4 w-4" /> Ricarica App
          </Button>
        </div>
      </div>
    );
  }

  if (!mounted || !services) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Inizializzazione Garage Music Club...
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
