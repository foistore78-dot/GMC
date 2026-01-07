"use client";

import { useEffect, useState } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ADMIN_EMAIL = 'fois.tore78@gmail.com';
const ADMIN_PASSWORD = 'password'; // This is a default for initial setup.
const ADMIN_USERNAME = 'admin_gmc';

/**
 * An invisible component that ensures the primary admin user exists
 * and has the correct role in Firestore. This runs once on app startup.
 */
function AdminUserInitializer() {
  const auth = useAuth();
  const firestore = useFirestore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!auth || !firestore || isInitialized) return;

    const initializeAdmin = async () => {
      try {
        let userCredential: UserCredential | null = null;

        // 1. Try to sign in.
        try {
          userCredential = await signInWithEmailAndPassword(
            auth,
            ADMIN_EMAIL,
            ADMIN_PASSWORD
          );
        } catch (error: any) {
          // 2. If user does not exist, create them.
          if (error.code === 'auth/user-not-found') {
            userCredential = await createUserWithEmailAndPassword(
              auth,
              ADMIN_EMAIL,
              ADMIN_PASSWORD
            );
          } else if (error.code === 'auth/invalid-credential') {
            // This is OK. It means the user exists but the password was changed.
            // We can't proceed with creating the role doc here because we aren't authenticated.
            // The user will need to log in normally. We will just exit.
            console.log("Admin user exists with a different password. Initialization skipped, will rely on normal login.");
            setIsInitialized(true);
            return; 
          } else {
            // For other errors, we re-throw to be caught by the outer catch block.
            throw error;
          }
        }

        if (!userCredential || !userCredential.user) {
          throw new Error('Failed to get user credential.');
        }
        
        const user = userCredential.user;

        // 3. Check if the admin role document exists in Firestore and create if not.
        const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
        const adminDoc = await getDoc(adminRoleRef);

        if (!adminDoc.exists()) {
          await setDoc(adminRoleRef, {
            email: user.email,
            role: 'admin',
            username: ADMIN_USERNAME,
            id: user.uid,
          });
          console.log(`Admin role created for ${user.email}`);
        } else {
          console.log(`Admin role for ${user.email} already exists.`);
        }

      } catch (error: any) {
        // We log errors here but don't block the UI.
        // This process is for setup, not for user-facing error reporting.
        console.error('Admin user initialization failed:', error.message);
      } finally {
        // Sign out the temporary user to not affect the app's auth state.
        if (auth.currentUser) {
          await auth.signOut();
        }
        setIsInitialized(true);
      }
    };

    initializeAdmin();
  }, [auth, firestore, isInitialized]);

  // This component renders nothing.
  return null;
}

export default AdminUserInitializer;
