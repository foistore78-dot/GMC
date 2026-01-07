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
          // Try to sign in silently. This will succeed if the user already exists.
          userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        } catch (error: any) {
          // If sign-in fails, check if the user needs to be created.
          if (error.code === 'auth/user-not-found') {
            userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
          } else if (error.code === 'auth/email-already-in-use') {
             // This can happen in some race conditions. If the user already exists,
             // we can just try to sign in again. This is safe to do.
             userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
          } else if (error.code === 'auth/invalid-credential') {
            // This is the most likely error if the user exists but something is wrong.
            // We can proceed, assuming the user exists, and the role check will happen next.
            // No need to create a new user. We can sign them out later to be safe.
          }
          else {
            // For other errors (e.g., network), log them and stop.
            console.error("Admin sign-in/creation error:", error);
            setIsInitialized(true); // Mark as initialized to prevent loops
            return;
          }
        }
        
        // At this point, we either signed in or created the user.
        // Or we failed to sign in but assume the user exists to check their role.
        const user = auth.currentUser;
        
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
