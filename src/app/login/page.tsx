
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
import { AlertCircle, Loader2, Eye, EyeOff, Database } from "lucide-react";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword, writeBatch } from "firebase/auth";
import { collection, writeBatch as firestoreWriteBatch, doc } from "firebase/firestore";
import { sociDataSeed } from "@/lib/seed-data";
import { useToast } from "@/hooks/use-toast";


const ADMIN_EMAIL = 'garage.music.club2024@gmail.com';
const ADMIN_PASSWORD = 'password';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState(ADMIN_PASSWORD);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    // Redirect if the user is already logged in and not loading.
    if (user && !isUserLoading) {
      router.push("/admin");
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    setError("");
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The onAuthStateChanged listener in the provider will handle the redirect.
      // We can manually push here as a fallback.
      router.push("/admin");
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        setError("Credenziali non valide. Verifica email e password.");
      } else {
        setError(`Errore di accesso: ${error.message}`);
      }
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleSeedData = async () => {
    if (!firestore) {
      toast({
        title: "Errore",
        description: "Firestore non è disponibile.",
        variant: "destructive",
      });
      return;
    }
    setIsSeeding(true);
    
    try {
      const batch = firestoreWriteBatch(firestore);
      const requestsCollection = collection(firestore, "membership_requests");

      sociDataSeed.forEach(socio => {
        const docRef = doc(requestsCollection); // Firestore will generate a new ID
        const { id, ...socioData } = socio; // exclude the static id
        batch.set(docRef, socioData);
      });

      await batch.commit();

      toast({
        title: "Successo!",
        description: `${sociDataSeed.length} richieste di iscrizione di test sono state aggiunte.`,
      });

    } catch (error) {
       console.error("Error seeding data:", error);
       toast({
        title: "Errore nel seeding",
        description: `Non è stato possibile caricare i dati di test. Dettagli: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };


  // While checking auth state or if user is already logged in, show a loader.
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

  // If not loading and no user, show the login form.
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
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full font-bold" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isLoading ? "Verifica in corso..." : "Login"}
              </Button>
               {process.env.NODE_ENV === 'development' && (
                  <Button type="button" variant="outline" className="w-full" onClick={handleSeedData} disabled={isSeeding}>
                    {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                    {isSeeding ? "Caricamento..." : "Aggiungi Dati Test"}
                  </Button>
                )}
            </CardFooter>
          </form>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
