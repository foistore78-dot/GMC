'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;

/**
 * Inizializza Firebase garantendo un'unica istanza (Singleton).
 * Forza il recupero dei servizi se l'app è già presente.
 */
export function initializeFirebase() {
  if (typeof window === 'undefined') {
    return { firebaseApp: null, auth: null, firestore: null };
  }

  try {
    const apps = getApps();
    if (apps.length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = apps[0];
    }
    
    if (app) {
      // Otteniamo i servizi. Firebase JS SDK gestisce internamente il singleton dei servizi per l'app data.
      auth = getAuth(app);
      firestore = getFirestore(app);
    }
  } catch (error) {
    console.error("Errore critico inizializzazione Firebase:", error);
  }

  return {
    firebaseApp: app || null,
    auth: auth || null,
    firestore: firestore || null,
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';