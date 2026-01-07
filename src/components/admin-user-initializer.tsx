"use client";

import { useEffect, useState } from "react";
import { useAuth, useFirestore, setDocumentNonBlocking } from "@/firebase";
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
          // If the user does not exist, create them.
          if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
          } else {
            // For other errors (e.g., network), just log them and stop.
            console.error("Admin sign-in error:", error);
            return;
          }
        }

        const user = userCredential.user;
        if (user) {
          const adminRoleRef = doc(firestore, "roles_admin", user.uid);
          const adminRoleDoc = await getDoc(adminRoleRef);

          if (!adminRoleDoc.exists()) {
            // Using await with setDoc here to ensure role is created before proceeding.
            await setDoc(adminRoleRef, {
              email: user.email,
              role: "admin",
              username: "admin_gmc",
              id: user.uid,
            });
            console.log("Admin role document created in Firestore.");
          }
        }
      } catch (error) {
        console.error("Error during admin initialization:", error);
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
