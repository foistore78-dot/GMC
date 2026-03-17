'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

let firebaseApp: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;

/**
 * Inizializza i servizi Firebase garantendo che siano singleton lato client.
 */
export function initializeFirebase() {
  if (typeof window === 'undefined') return null;

  try {
    if (!firebaseApp) {
      // Verifica se l'app è già stata inizializzata per evitare errori di duplicazione
      firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      auth = getAuth(firebaseApp);
      firestore = getFirestore(firebaseApp);
    }

    return {
      firebaseApp,
      auth: auth!,
      firestore: firestore!
    };
  } catch (error) {
    console.error("Errore critico durante l'inizializzazione di Firebase:", error);
    return null;
  }
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';