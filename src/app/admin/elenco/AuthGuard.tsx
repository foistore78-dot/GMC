"use client";

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ElencoClient from './ElencoClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Loader2 } from 'lucide-react';
import { useAuth, useFirebase } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';

const ADMIN_PASSWORD = "Gmc!new2026";

export default function AuthGuard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const { auth, user, isUserLoading } = useFirebase();

  // If user is already authenticated (e.g. from a previous session),
  // and they have passed the password check, show the content.
  useEffect(() => {
    if (user && sessionStorage.getItem('gmc-auth-passed') === 'true') {
      setIsAuthenticated(true);
    }
  }, [user]);
  
  const handleLogin = async () => {
    if (password === ADMIN_PASSWORD) {
      setError('');
      setIsSigningIn(true);
      try {
        if (auth) {
          // If there's no user, sign in anonymously.
          if (!user) {
            await signInAnonymously(auth);
          }
          // After successful sign-in (or if already signed in), set flags.
          sessionStorage.setItem('gmc-auth-passed', 'true');
          setIsAuthenticated(true);
        } else {
            throw new Error("Servizio di autenticazione non disponibile.");
        }
      } catch (e) {
         setError('Errore di autenticazione con Firebase.');
         console.error(e);
      } finally {
        setIsSigningIn(false);
      }

    } else {
      setError('Password non corretta.');
    }
  };

  if (isUserLoading || isSigningIn) {
      return (
        <div className="flex-grow flex items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Autenticazione in corso...</p>
        </div>
      );
  }

  if (isAuthenticated) {
    return <ElencoClient />;
  }

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
            <Button type="submit" className="w-full" disabled={isSigningIn}>
              {isSigningIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Accedi
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

    