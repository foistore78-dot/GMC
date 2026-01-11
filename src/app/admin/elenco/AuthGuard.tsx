"use client";

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ElencoClient from './ElencoClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';

const ADMIN_PASSWORD = "Gmc!new2026";

export default function AuthGuard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const { auth, user, isUserLoading } = useFirebase();

  // Step 1: Ensure anonymous user is signed in on component mount.
  useEffect(() => {
    if (isUserLoading) return; // Wait until Firebase has checked auth state.

    if (!user) { // If there's no user at all (neither logged in nor anonymous)
      if (auth) {
        signInAnonymously(auth).catch(e => {
            console.error("Anonymous sign-in failed", e);
            setError("Impossibile connettersi al servizio di autenticazione.");
            setIsLoading(false);
        });
      }
    } else {
        // User (anonymous or otherwise) already exists.
        setIsLoading(false);
    }
  }, [user, isUserLoading, auth]);

  // Step 2: If we have a user and they previously passed password check, authenticate them.
  useEffect(() => {
    if (user && sessionStorage.getItem('gmc-auth-passed') === 'true') {
      setIsAuthenticated(true);
    }
  }, [user]);
  
  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setError('');
      sessionStorage.setItem('gmc-auth-passed', 'true');
      setIsAuthenticated(true);
    } else {
      setError('Password non corretta.');
    }
  };
  
  const handleLogout = () => {
    sessionStorage.removeItem('gmc-auth-passed');
    setIsAuthenticated(false);
  };
  
  // Combines Firebase loading state with our internal logic loading state.
  const isOverallLoading = isUserLoading || isLoading;

  if (isOverallLoading) {
      return (
        <div className="flex-grow flex items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Autenticazione in corso...</p>
        </div>
      );
  }

  // If we have a valid user and they are authenticated via password, show the main content.
  if (user && isAuthenticated) {
    return <ElencoClient onLogout={handleLogout} />;
  }
  
  // Otherwise, show the password login form.
  return (
    <div className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                <Lock className="w-8 h-8 text-primary" />
            </div>
          <CardTitle>Accesso Riservato</CardTitle>
          <CardDescription>Inserisci la password per accedere all'area di amministrazione.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="w-full">
              Accedi
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
