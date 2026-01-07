"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    const adminEmail = "garage.music.club2024@gmail.com";
    const adminPassword = "password";

    if (!auth || !firestore) {
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
            return await createUserWithEmailAndPassword(
              auth,
              adminEmail,
              adminPassword
            );
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
            // Using setDocumentNonBlocking as we don't need to wait for this.
            setDocumentNonBlocking(
              adminRoleRef,
              {
                email: user.email,
                role: "admin",
                username: "admin_gmc",
              },
              { merge: true }
            );
            console.log("Admin role created in Firestore.");
          }
        }
        // Sign out after setup to not interfere with user flow
        await auth.signOut();
      } catch (error) {
        // We can get auth/invalid-credential if the user is already signed-in
        // this is fine.
        if ((error as any).code !== 'auth/invalid-credential') {
            console.error("Error initializing admin user:", error);
        }
      }
    };

    initializeAdmin();
  }, [auth, firestore]);

  return null; // This component does not render anything
}
