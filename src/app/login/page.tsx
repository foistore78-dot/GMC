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
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, type UserCredential } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;

    setError("");
    setIsLoading(true);

    let userCredential: UserCredential | null = null;

    try {
      // Step 1: Attempt to sign in
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    } catch (signInError: any) {
      // Step 2: If sign-in fails because the user doesn't exist, create the user
      if (signInError.code === 'auth/user-not-found') {
        try {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
        } catch (creationError: any) {
          setError(`Errore durante la creazione dell'account: ${creationError.message}`);
          setIsLoading(false);
          return;
        }
      } else if (signInError.code === 'auth/invalid-credential' || signInError.code === 'auth/wrong-password') {
        setError("Credenziali non valide. Riprova.");
        setIsLoading(false);
        return;
      } else if (signInError.code === 'auth/too-many-requests') {
        setError("Troppi tentativi falliti. L'accesso è temporaneamente bloccato.");
        setIsLoading(false);
        return;
      } else {
        setError(`Si è verificato un errore imprevisto: ${signInError.message}`);
        setIsLoading(false);
        return;
      }
    }

    // Step 3: If we have a user (either from sign-in or creation), ensure their admin role exists.
    if (userCredential && userCredential.user) {
      try {
        const adminRoleRef = doc(firestore, 'roles_admin', userCredential.user.uid);
        await setDoc(adminRoleRef, {
          email: userCredential.user.email,
          role: 'admin',
          username: ADMIN_USERNAME,
          id: userCredential.user.uid,
        }, { merge: true });
        
        // Step 4: Manually redirect to the admin page ONLY after the role has been set.
        router.push("/admin");

      } catch (roleError: any) {
        setError(`Impossibile impostare i permessi di amministratore: ${roleError.message}`);
      }
    } else {
        setError("Impossibile ottenere le credenziali dell'utente dopo il login/registrazione.");
    }

    setIsLoading(false);
  };

  // Show a loader while the initial auth state is being determined or if we are redirecting.
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
