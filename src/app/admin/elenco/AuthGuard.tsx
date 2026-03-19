"use client";

import { useState, ReactNode, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, LogIn, Loader2, AlertCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useFirebase, initializeFirebase } from '@/firebase';
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRetry, setShowRetry] = useState(false);

  const { auth, areServicesAvailable } = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!areServicesAvailable) {
        setShowRetry(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [areServicesAvailable]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Inserisci sia l\'email che la password.');
      return;
    }

    if (!auth) {
        setError("I servizi non sono pronti. Prova a ricaricare la pagina.");
        return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      toast({
        title: "Accesso Effettuato",
        description: "Benvenuto nel pannello di controllo.",
      });
    } catch (e: any) {
      console.error("Login Error:", e.code, e.message);
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError('Password errata o credenziali non valide.');
      } else if (e.code === 'auth/user-not-found') {
        setError('Utente non trovato.');
      } else if (e.code === 'auth/invalid-api-key') {
        setError('Errore di configurazione: API Key non valida. Controlla il file config.ts.');
      } else {
        setError(`Errore: ${e.message}`);
      }
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleForceRetry = () => {
    window.location.reload();
  };
  
  if (isAdmin) {
    return <>{children}</>;
  }
  
  return (
    <div className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-sm shadow-2xl border-primary/20 bg-background/80 backdrop-blur-md">
        <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
                <Lock className="w-8 h-8 text-primary" />
            </div>
          <CardTitle className="font-headline text-2xl">Area Riservata</CardTitle>
          <CardDescription>Inserisci le tue credenziali</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
               <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isSubmitting || !areServicesAvailable}
                className="bg-secondary/50"
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isSubmitting || !areServicesAvailable}
                  className="bg-secondary/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  disabled={!areServicesAvailable}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {error && (
                <Alert variant="destructive" className="py-2 px-3">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <AlertDescription className="text-xs font-medium">
                        {error}
                        </AlertDescription>
                    </div>
                </Alert>
              )}
            </div>

            {!areServicesAvailable ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground animate-pulse py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Collegamento a Firebase...</span>
                </div>
                {showRetry && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full text-xs h-9" 
                    onClick={handleForceRetry}
                  >
                    <RefreshCw className="mr-2 h-3 w-3" /> Ricarica Servizi
                  </Button>
                )}
              </div>
            ) : (
              <Button 
                type="submit" 
                className="w-full font-bold h-11" 
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Verifica..." : "Accedi"}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
