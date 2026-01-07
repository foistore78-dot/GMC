"use client";

import { useEffect, useState } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ADMIN_EMAIL = 'fois.tore78@gmail.com';
const ADMIN_PASSWORD = 'password';
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
        // 1. Attempt to sign in to see if the user exists.
        const userCredential = await signInWithEmailAndPassword(
          auth,
          ADMIN_EMAIL,
          ADMIN_PASSWORD
        ).catch(async (error) => {
          // 2. If user does not exist, create them.
          if (error.code === 'auth/user-not-found') {
            return await createUserWithEmailAndPassword(
              auth,
              ADMIN_EMAIL,
              ADMIN_PASSWORD
            );
          }
          // For other errors (like wrong password on an existing account), we don't proceed.
          // In a real app, this would need more robust handling.
          throw error;
        });

        const user = userCredential.user;
        if (!user) {
          throw new Error('Failed to get user credential.');
        }

        // 3. Check if the admin role document exists in Firestore.
        const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
        const adminDoc = await getDoc(adminRoleRef);

        // 4. If the role document does not exist, create it.
        if (!adminDoc.exists()) {
          await setDoc(adminRoleRef, {
            email: user.email,
            role: 'admin',
            username: ADMIN_USERNAME,
            id: user.uid,
          });
          console.log(`Admin role created for ${user.email}`);
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
