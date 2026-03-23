
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFirebase } from "@/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings as SettingsIcon, Save, Link as LinkIcon, AlertCircle, FileUp, Lock } from "lucide-react";
import AuthGuard from "../elenco/AuthGuard";
import { signOut } from "firebase/auth";
import { importFromExcel, type ImportResult } from "@/lib/excel-import";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SECURITY_PASSWORD = "1978";

export default function SettingsPageClient() {
  const router = useRouter();
  const { auth, user, firestore, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const importFileRef = useRef<HTMLInputElement>(null);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  
  const [config, setConfig] = useState({
    whatsAppInviteLink1: "",
    whatsAppInviteLink2: ""
  });

  const [isSecurityDialogOpen, setIsSecurityDialogOpen] = useState(false);
  const [securityPasswordInput, setSecurityPasswordInput] = useState("");

  const checkAdminStatus = useCallback(async () => {
    if (!user) {
        setIsAdmin(false);
        setIsCheckingAdmin(false);
        return;
    }
    const adminEmail = "garage.music.club2024@gmail.com";
    if (user.email?.toLowerCase() === adminEmail.toLowerCase()) {
        setIsAdmin(true);
        setIsCheckingAdmin(false);
        return;
    }
    if (firestore) {
        try {
            const adminRef = doc(firestore, "roles_admin", user.uid);
            const adminSnap = await getDoc(adminRef);
            setIsAdmin(adminSnap.exists());
        } catch (e) {
            setIsAdmin(false);
        }
    }
    setIsCheckingAdmin(false);
  }, [user, firestore]);

  useEffect(() => {
    if (!isUserLoading) checkAdminStatus();
  }, [user, isUserLoading, checkAdminStatus]);

  useEffect(() => {
    if (isAdmin && firestore) {
      const fetchConfig = async () => {
        try {
          const docRef = doc(firestore, "settings", "general");
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setConfig(snap.data() as any);
          }
        } catch (e) {
          console.error("Error fetching config", e);
        } finally {
          setIsLoadingConfig(false);
        }
      };
      fetchConfig();
    }
  }, [isAdmin, firestore]);

  const handleSave = async () => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await setDoc(doc(firestore, "settings", "general"), config, { merge: true });
      toast({
        title: "Impostazioni salvate",
        description: "I link di invito WhatsApp sono stati aggiornati.",
      });
    } catch (e) {
      toast({
        title: "Errore durante il salvataggio",
        description: "Non è stato possibile aggiornare le impostazioni.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    if (auth) {
      signOut(auth).then(() => {
        router.push('/');
      });
    }
  };

  const initiateImport = () => {
    setSecurityPasswordInput("");
    setIsSecurityDialogOpen(true);
  };

  const verifySecurityPassword = () => {
    if (securityPasswordInput === SECURITY_PASSWORD) {
      setIsSecurityDialogOpen(false);
      importFileRef.current?.click();
    } else {
      toast({
        title: "Password Errata",
        description: "La password di sicurezza inserita non è corretta.",
        variant: "destructive"
      });
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !firestore) return;
    
    setIsImporting(true);
    try {
        const result: ImportResult = await importFromExcel(file, firestore);
        toast({
            title: "Importazione Completata",
            description: `${result.createdCount} nuovi soci creati. ${result.updatedTessere.length} soci aggiornati.`,
            duration: 5000,
        });
    } catch(error) {
        toast({
            title: "Errore di Importazione",
            description: (error as Error).message || "Si è verificato un errore sconosciuto.",
            variant: "destructive",
        });
    } finally {
        setIsImporting(false);
        if (importFileRef.current) importFileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header onLogout={isAdmin ? handleLogout : undefined} />
      <main className="flex-grow container mx-auto px-4 py-8">
        {isUserLoading || isCheckingAdmin ? (
          <div className="flex-grow flex items-center justify-center p-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <AuthGuard isAdmin={isAdmin}>
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex items-center gap-4 mb-2">
              <SettingsIcon className="w-8 h-8 text-primary" />
              <h1 className="font-headline text-3xl text-primary">Opzioni</h1>
            </div>

            <Card className="border-primary/20 bg-background/50 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-primary" />
                  Link Invito WhatsApp
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Inserisci i link dei gruppi WhatsApp per l'invio rapido delle notifiche.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingConfig ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="link1" className="text-foreground font-bold">Link Gruppo 1</Label>
                      <Input 
                        id="link1" 
                        placeholder="https://chat.whatsapp.com/..." 
                        value={config.whatsAppInviteLink1}
                        onChange={(e) => setConfig({...config, whatsAppInviteLink1: e.target.value})}
                        className="bg-secondary/50 border-primary/20 text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="link2" className="text-foreground font-bold">Link Gruppo 2</Label>
                      <Input 
                        id="link2" 
                        placeholder="https://chat.whatsapp.com/..." 
                        value={config.whatsAppInviteLink2}
                        onChange={(e) => setConfig({...config, whatsAppInviteLink2: e.target.value})}
                        className="bg-secondary/50 border-primary/20 text-foreground"
                      />
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="border-t border-primary/10 pt-6">
                <Button onClick={handleSave} disabled={isSaving || isLoadingConfig} className="w-full sm:w-auto">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salva Modifiche
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-primary/20 bg-background/50 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileUp className="w-5 h-5 text-primary" />
                  Importazione Dati
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Carica un file Excel (.xlsx) per importare o aggiornare l'elenco soci.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 mb-4 text-sm text-foreground">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 text-primary" />
                    <p>Assicurati che il file Excel segua il formato corretto scaricato tramite la funzione "Esporta".</p>
                  </div>
                </div>
                <input type="file" onChange={handleFileImport} ref={importFileRef} className="hidden" accept=".xlsx, .xls"/>
                <Button 
                  onClick={initiateImport} 
                  disabled={isImporting} 
                  variant="outline" 
                  className="w-full border-primary/20 hover:bg-primary/10"
                >
                  {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                  {isImporting ? "Importazione in corso..." : "Seleziona file Excel"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </AuthGuard>
        )}
      </main>
      <Footer />

      <Dialog open={isSecurityDialogOpen} onOpenChange={setIsSecurityDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Verifica di Sicurezza
            </DialogTitle>
            <DialogDescription>
              Inserisci la password di sicurezza per procedere con l'importazione.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="security-password">Password</Label>
              <Input
                id="security-password"
                type="password"
                value={securityPasswordInput}
                onChange={(e) => setSecurityPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifySecurityPassword()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSecurityDialogOpen(false)}>Annulla</Button>
            <Button onClick={verifySecurityPassword}>Conferma</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
