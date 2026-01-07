"use client";

import { useEffect, useState } from "react";
import { useAuth, useFirestore } from "@/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

// This component ensures the admin user exists in Auth and Firestore.
// It's a client-side one-off setup.
export function AdminUserInitializer() {
  const auth = useAuth();
  const firestore = useFirestore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const adminEmail = "garage.music.club2024@gmail.com";
    const adminPassword = "password";

    if (!auth || !firestore || isInitialized) {
      return;
    }

    const initializeAdmin = async () => {
      try {
        let userCredential;
        try {
          // Try to sign in silently. This will succeed if the user already exists
          // and the password is correct.
          userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        } catch (error: any) {
          // If sign-in fails for any reason (user-not-found, invalid-credential),
          // we proceed to create the user. This ensures the user exists with the correct password.
          try {
            userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
          } catch (creationError: any) {
            // This can happen in a race condition if another client created the user
            // between our failed sign-in and this creation attempt.
            if (creationError.code === 'auth/email-already-in-use') {
               // The user now exists, so we can proceed. We can try signing in again
               // just to be sure we have the user credential.
               userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
            } else {
              // For other creation errors, log them and stop.
              console.error("Admin user creation error:", creationError);
              setIsInitialized(true);
              return;
            }
          }
        }
        
        // At this point, we have a valid user credential.
        const user = userCredential.user;
        
        if (user) {
          const adminRoleRef = doc(firestore, "roles_admin", user.uid);
          const adminRoleDoc = await getDoc(adminRoleRef);

          if (!adminRoleDoc.exists()) {
            await setDoc(adminRoleRef, {
              email: user.email,
              role: "admin",
              username: "admin_gmc",
              id: user.uid,
            });
            console.log("Admin role document created in Firestore.");
          }
        }
      } catch (error: any) {
        // We log other potential errors but prevent the app from crashing.
        if (error.code !== 'auth/email-already-in-use') {
            console.error("Error during admin initialization:", error);
        }
      } finally {
        setIsInitialized(true);
        // It's crucial to sign out to ensure the user logs in through the UI
        // which allows the application state to be set correctly.
        if (auth.currentUser) {
            await auth.signOut();
        }
      }
    };

    initializeAdmin();

  }, [auth, firestore, isInitialized]);

  return null; // This component does not render anything.
}
