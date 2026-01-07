"use client";

import { useEffect, useState } from "react";
import { useAuth, useFirestore } from "@/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User,
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
        let user: User | null = null;
        
        try {
          // Attempt to sign in. If it works, we have the user.
          const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
          user = userCredential.user;
        } catch (error: any) {
          // If sign-in fails because the user doesn't exist, create it.
          if (error.code === 'auth/user-not-found') {
            const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
            user = userCredential.user;
          }
          // If sign-in fails for any other reason (like wrong password, which we can't fix here),
          // we log it but don't crash. The user won't have admin rights.
          else if (error.code !== 'auth/invalid-credential') {
             console.error("Admin user initialization sign-in error:", error);
          }
        }
        
        // If we have a user (either from sign-in or creation), ensure their role exists.
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
        // Catch any other unexpected errors during the process.
         if (error.code !== 'auth/email-already-in-use') {
            console.error("Error during admin initialization:", error);
        }
      } finally {
        setIsInitialized(true);
        // CRITICAL: Always sign out after initialization.
        // This forces the user to log in through the UI, which correctly
        // sets up the application's auth state for the admin pages.
        if (auth.currentUser) {
            await auth.signOut();
        }
      }
    };

    initializeAdmin();

  }, [auth, firestore, isInitialized]);

  return null; // This component does not render anything.
}
