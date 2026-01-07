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
import { AlertCircle, Loader2 } from "lucide-react";
import { useAuth, useUser, useFirestore } from "@/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [email, setEmail] = useState("garage.music.club2024@gmail.com");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push("/admin");
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isUserLoading || user) return; // Previene invii multipli

    setError("");
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Il useEffect gestirà il reindirizzamento
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        // Se l'utente non esiste, crealo.
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const newUser = userCredential.user;

          // Crea il documento per il ruolo di amministratore in Firestore
          const adminRoleRef = doc(firestore, "roles_admin", newUser.uid);
          await setDoc(adminRoleRef, {
            email: newUser.email,
            role: "admin",
            username: "admin_gmc",
            id: newUser.uid,
          });
          // L'autenticazione è già avvenuta, il useEffect farà il reindirizzamento.
        } catch (creationError: any) {
          setError("Errore durante la creazione dell'utente admin.");
          console.error("Admin user creation error:", creationError);
        }
      } else if (err.code === 'auth/invalid-credential') {
          // L'utente esiste, ma la password è sbagliata.
          setError("Credenziali non valide. Riprova.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Troppi tentativi falliti. Il tuo account è stato temporaneamente bloccato. Riprova più tardi.");
      } else {
        // Per tutti gli altri errori
        setError("Si è verificato un errore imprevisto. Riprova.");
        console.error("Login error:", err);
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
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
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
