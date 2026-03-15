
"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFirestore, useFirebase } from "@/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings as SettingsIcon, Save, Link as LinkIcon, AlertCircle } from "lucide-react";
import AuthGuard from "../elenco/AuthGuard";
import { signOut } from "firebase/auth";
import { useCallback } from "react";

export default function SettingsPage() {
  const { auth, user, firestore, isUserLoading } = useFirebase();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  
  const [config, setConfig] = useState({
    whatsAppInviteLink1: "",
    whatsAppInviteLink2: ""
  });

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
    if (auth) signOut(auth);
  };

  if (isUserLoading || isCheckingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header onLogout={isAdmin ? handleLogout : undefined} />
      <main className="flex-grow container mx-auto px-4 py-8">
        <AuthGuard isAdmin={isAdmin}>
          <div className="max-w-2xl mx-auto space-y-6">
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
                <CardDescription>
                  Inserisci i link dei gruppi WhatsApp. Potrai scegliere quale inviare al momento della notifica al socio.
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
                      <Label htmlFor="link1" className="text-primary font-bold">Link Gruppo 1</Label>
                      <Input 
                        id="link1" 
                        placeholder="https://chat.whatsapp.com/..." 
                        value={config.whatsAppInviteLink1}
                        onChange={(e) => setConfig({...config, whatsAppInviteLink1: e.target.value})}
                        className="bg-secondary/50 border-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="link2" className="text-primary font-bold">Link Gruppo 2</Label>
                      <Input 
                        id="link2" 
                        placeholder="https://chat.whatsapp.com/..." 
                        value={config.whatsAppInviteLink2}
                        onChange={(e) => setConfig({...config, whatsAppInviteLink2: e.target.value})}
                        className="bg-secondary/50 border-primary/20"
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

            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 flex gap-3 text-sm text-primary-foreground/80">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>
                Questi link verranno utilizzati quando clicchi sull'icona WhatsApp accanto al nome del socio nella tabella elenco.
              </p>
            </div>
          </div>
        </AuthGuard>
      </main>
      <Footer />
    </div>
  );
}
