"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth, useFirestore, useUser } from "@/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

const ADMIN_EMAIL = 'fois.tore78@gmail.com';
const ADMIN_PASSWORD = 'password';
const ADMIN_USERNAME = 'admin_gmc';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState(ADMIN_PASSWORD);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  // Redirect if user is already logged in
  useEffect(() => {
    if (user && !isUserLoading) {
      router.push("/admin");
    }
  }, [user, isUserLoading, router]);

  // Ensure admin role exists after user logs in or is created
  useEffect(() => {
    const ensureAdminRole = async () => {
      if (user && firestore) {
        const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
        const docSnap = await getDoc(adminRoleRef);
        if (!docSnap.exists()) {
          try {
            await setDoc(adminRoleRef, {
              email: user.email,
              role: 'admin',
              username: ADMIN_USERNAME,
              id: user.uid,
            });
            // Role created, now we can safely redirect or the app will proceed
            router.push('/admin');
          } catch (e) {
            console.error("Failed to create admin role:", e);
            setError("Impossibile impostare i permessi di amministratore.");
          }
        }
      }
    };
    ensureAdminRole();
  }, [user, firestore, router]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isUserLoading || !auth || !firestore) return;

    setError("");
    setIsLoading(true);

    try {
      // Step 1: Try to sign in.
      await signInWithEmailAndPassword(auth, email, password);
      // On success, the useEffects will handle redirection and role creation.
    } catch (signInError: any) {
        // Step 2: If sign-in fails, figure out why.
        if (signInError.code === 'auth/user-not-found') {
            // Step 2a: If user does not exist, create them.
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                // On success, the useEffects will handle redirection and role creation.
                if (!userCredential.user) {
                  throw new Error("La creazione dell'utente non è riuscita.");
                }
            } catch (creationError: any) {
                setError(`Errore durante la creazione dell'account: ${creationError.message}`);
            }
        } else if (signInError.code === 'auth/invalid-credential' || signInError.code === 'auth/wrong-password') {
            setError("Credenziali non valide. Riprova.");
        } else if (signInError.code === 'auth/too-many-requests') {
            setError("Troppi tentativi falliti. L'accesso è temporaneamente bloccato.");
        } else {
            setError(`Si è verificato un errore imprevisto: ${signInError.message}`);
        }
    } finally {
        setIsLoading(false);
    }
  };

  if (isUserLoading || user) {
    return (
        <div className="flex flex-col min-h-screen bg-secondary">
            <Header />
            <main className="flex-grow flex items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </main>
            <Footer />
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-primary/20 bg-background">
          <form onSubmit={handleLogin}>
            <CardHeader className="text-center">
              <CardTitle className="font-headline text-3xl text-primary">Login Admin</CardTitle>
              <CardDescription>
                Inserisci le credenziali per accedere alla dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@music.com"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
                    aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Login Fallito</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full font-bold" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isLoading ? "Verifica in corso..." : "Login"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
