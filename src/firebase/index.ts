'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

/**
 * Singleton initialization for Firebase services on the client.
 * This ensures that Firebase is only initialized once and only in the browser.
 */
export function initializeFirebase() {
  if (typeof window === 'undefined') return null;

  try {
    // Check if there's already an initialized app
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    
    // Get instances for Auth and Firestore
    const auth = getAuth(app);
    const firestore = getFirestore(app);

    return {
      firebaseApp: app,
      auth,
      firestore
    };
  } catch (error) {
    console.error("Firebase Initialization Error:", error);
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
