"use client";

import { useEffect, useState } from "react";
import { useAuth, useFirestore, setDocumentNonBlocking } from "@/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// This component ensures the admin user exists in Auth and Firestore.
// It's a client-side one-off setup.
export function AdminUserInitializer() {
  const auth = useAuth();
  const firestore = useFirestore();
  const [isAdminInitialized, setIsAdminInitialized] = useState(false);

  useEffect(() => {
    const adminEmail = "garage.music.club2024@gmail.com";
    const adminPassword = "password";

    if (!auth || !firestore || isAdminInitialized) {
      return;
    }

    const initializeAdmin = async () => {
      try {
        // Attempt to sign in to see if the user exists
        const userCredential = await signInWithEmailAndPassword(
          auth,
          adminEmail,
          adminPassword
        ).catch(async (error) => {
          // If user not found, create it
          if (error.code === "auth/user-not-found" || error.code === 'auth/invalid-credential') {
            try {
              return await createUserWithEmailAndPassword(
                auth,
                adminEmail,
                adminPassword
              );
            } catch (creationError: any) {
              // If creation fails because email is in use, sign in again.
              if (creationError.code === 'auth/email-already-in-use') {
                return await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
              }
              throw creationError;
            }
          }
          throw error;
        });

        const user = userCredential.user;
        if (user) {
          // Check if the admin role document exists in Firestore
          const adminRoleRef = doc(firestore, "roles_admin", user.uid);
          const adminRoleDoc = await getDoc(adminRoleRef);

          if (!adminRoleDoc.exists()) {
            // If the role doesn't exist, create it.
            await setDocumentNonBlocking(
              adminRoleRef,
              {
                email: user.email,
                role: "admin",
                username: "admin_gmc",
              },
              { merge: true }
            );
            console.log("Admin role created in Firestore.");
            // Don't sign out immediately, let the user session begin
          }
        }
      } catch (error) {
        // We can get auth/invalid-credential if the user is already signed-in
        // this is fine. We also might get it if the password is wrong during setup.
        if ((error as any).code !== 'auth/invalid-credential') {
            console.error("Error initializing admin user:", error);
        }
      } finally {
        setIsAdminInitialized(true);
        // Only sign out if no user is actually logged in, to clean up.
        // This prevents signing out the user who just logged in.
        if (!auth.currentUser) {
            await auth.signOut();
        }
      }
    };

    initializeAdmin();
  }, [auth, firestore, isAdminInitialized]);

  return null; // This component does not render anything
}
