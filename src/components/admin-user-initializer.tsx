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
      let user: User | null = null;
      let userCredential;

      try {
        // Try to sign in first. This is the normal case.
        userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        user = userCredential.user;
      } catch (error: any) {
        // If sign-in fails because user not found or password is wrong, create the user.
        // This effectively creates the user or resets the password if it was wrong.
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
            user = userCredential.user;
          } catch (creationError: any) {
            // This can happen in a race condition where another client created the user
            // between our failed sign-in and our creation attempt.
            if (creationError.code === 'auth/email-already-in-use') {
               // The user now exists, so we can try signing in again to get the user object.
               try {
                   userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
                   user = userCredential.user;
               } catch (finalSignInError) {
                   console.error("Admin final sign-in attempt failed:", finalSignInError);
               }
            } else {
               console.error("Admin user creation error:", creationError);
            }
          }
        } else {
           console.error("Admin sign-in error during initialization:", error);
        }
      }

      try {
        // If we have a user (from sign-in or creation), ensure their role exists in Firestore.
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
      } catch(firestoreError) {
        console.error("Error during Firestore role initialization:", firestoreError);
      }
      finally {
        setIsInitialized(true);
        // CRITICAL: Always sign out after initialization.
        // This forces a clean state and requires the user to log in through the UI.
        // By the time they log in, the Firestore role document will have been created.
        if (auth.currentUser) {
            await auth.signOut();
        }
      }
    };

    initializeAdmin();

  }, [auth, firestore, isInitialized]);

  return null; // This component does not render anything.
}
