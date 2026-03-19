'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;

/**
 * Inizializza i servizi Firebase garantendo che siano disponibili dopo il primo caricamento.
 */
export function initializeFirebase() {
  if (typeof window === 'undefined') {
    return { firebaseApp: null, auth: null, firestore: null };
  }

  try {
    // 1. Inizializza l'app se non esiste
    if (!app) {
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    }
    
    // 2. Assicurati che i servizi siano collegati all'istanza corretta
    if (!auth && app) {
      auth = getAuth(app);
    }
    
    if (!firestore && app) {
      firestore = getFirestore(app);
    }
  } catch (error) {
    console.error("Errore durante l'inizializzazione dei servizi Firebase:", error);
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
