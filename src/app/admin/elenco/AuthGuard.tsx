
"use client";

import { useEffect, useState, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, LogIn, Loader2, AlertCircle } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuthGuardProps {
    children: ReactNode;
    isAdmin: boolean;
}

export default function AuthGuard({ children, isAdmin }: AuthGuardProps) {
  const [email, setEmail] = useState('garage.music.club2024@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { auth } = useFirebase();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
        setError("Servizio di autenticazione non disponibile.");
        return;
    }
    if (!email || !password) {
      setError('Inserisci email e password.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // On successful login, the parent component will detect the auth state change
      // and re-render with isAdmin=true, so we don't need to do anything else here.
      toast({
        title: "Accesso Effettuato",
        description: "Benvenuto nell'area di amministrazione.",
      });
    } catch (e: any) {
      switch (e.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Credenziali non valide. Riprova.');
          break;
        default:
          setError('Si è verificato un errore imprevisto durante l\'accesso.');
          break;
      }
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (isAdmin) {
    return <>{children}</>;
  }
  
  return (
    <div className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                <Lock className="w-8 h-8 text-primary" />
            </div>
          <CardTitle>Area Amministrazione</CardTitle>
          <CardDescription>Inserisci le credenziali per accedere al pannello.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleLogin}
            className="space-y-4"
          >
            <div className="space-y-2">
               <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isSubmitting}
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={isSubmitting}
              />
              {error && (
                <Alert variant="destructive" className="p-2">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                        {error}
                        </AlertDescription>
                    </div>
                </Alert>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              {isSubmitting ? "Accesso in corso..." : "Accedi"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
