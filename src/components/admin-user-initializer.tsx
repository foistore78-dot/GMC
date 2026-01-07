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

      try {
        // Try to sign in first.
        const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        user = userCredential.user;
      } catch (error: any) {
        // If sign-in fails because user not found or password is wrong, create the user.
        // This effectively resets the password if it was wrong.
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
            user = userCredential.user;
          } catch (creationError: any) {
            // If creation fails because the email is *already* in use (race condition),
            // we can just ignore it and proceed. The user exists.
            if (creationError.code !== 'auth/email-already-in-use') {
               console.error("Admin user creation error:", creationError);
            }
          }
        } else {
           console.error("Admin sign-in error during initialization:", error);
        }
      }

      try {
        // If we still don't have a user, try one last sign-in. This is needed if createUser failed with email-already-in-use.
        if (!user) {
           const finalSignIn = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
           user = finalSignIn.user;
        }

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
      } catch(finalError) {
        // Catch errors from the final sign-in or firestore operations
        console.error("Error during final stage of admin initialization:", finalError);
      }
      finally {
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
