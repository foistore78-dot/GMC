
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFirebase } from "@/firebase";
import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings as SettingsIcon, Save, Link as LinkIcon, AlertCircle, Lock, Users, RefreshCw } from "lucide-react";
import AuthGuard from "../elenco/AuthGuard";
import { signOut } from "firebase/auth";
import { BuildFooter } from "@/components/build-footer";
import { getStatus, parseDate, formatDate } from "@/lib/utils";
import type { Socio } from "@/lib/soci-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SECURITY_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_SECURITY_PASSWORD || "1978";


export default function SettingsPageClient() {
  const router = useRouter();
  const { auth, user, firestore, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  
  const [config, setConfig] = useState({
    whatsAppInviteLink1: "",
    whatsAppInviteLink2: "",
    maintenanceMode: false
  });

  const [isSecurityDialogOpen, setIsSecurityDialogOpen] = useState(false);
  const [securityPasswordInput, setSecurityPasswordInput] = useState("");
  const [pendingSecurityAction, setPendingSecurityAction] = useState<'merge-duplicates' | 'toggle-maintenance' | null>(null);
  const [isMergingDuplicates, setIsMergingDuplicates] = useState(false);

  const checkAdminStatus = useCallback(async () => {
    if (!user) {
        setIsAdmin(false);
        setIsCheckingAdmin(false);
        return;
    }
    
    const sessionKey = `gmc_is_admin_${user.uid}`;
    const cached = typeof window !== 'undefined' ? sessionStorage.getItem(sessionKey) : null;
    if (cached !== null) {
        setIsAdmin(cached === 'true');
        setIsCheckingAdmin(false);
        return;
    }

    if (firestore) {
        try {
            const adminRef = doc(firestore, "roles_admin", user.uid);
            const adminSnap = await getDoc(adminRef);
            const hasRole = adminSnap.exists();
            setIsAdmin(hasRole);
            if (typeof window !== 'undefined') sessionStorage.setItem(sessionKey, String(hasRole));
        } catch (e) {
            setIsAdmin(false);
        }
    }

    setIsCheckingAdmin(false);
  }, [user, firestore]);

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        const sessionKey = `gmc_is_admin_${user.uid}`;
        const cached = typeof window !== 'undefined' ? sessionStorage.getItem(sessionKey) : null;
        if (cached !== null) {
          setIsAdmin(cached === 'true');
          setIsCheckingAdmin(false);
          return;
        }
      }
      checkAdminStatus();
    }
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

  const initiateMergeDuplicates = () => {
    setPendingSecurityAction('merge-duplicates');
    setSecurityPasswordInput("");
    setIsSecurityDialogOpen(true);
  };

  const handleToggleMaintenanceClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setPendingSecurityAction('toggle-maintenance');
    setSecurityPasswordInput("");
    setIsSecurityDialogOpen(true);
  };

  const verifySecurityPassword = () => {
    if (securityPasswordInput === SECURITY_PASSWORD) {
      setIsSecurityDialogOpen(false);
      const action = pendingSecurityAction;
      setPendingSecurityAction(null);
      if (action === 'merge-duplicates') {
        handleMergeDuplicates();
      } else if (action === 'toggle-maintenance') {
        const newMaintenanceVal = !config.maintenanceMode;
        setConfig(prev => {
          const updated = { ...prev, maintenanceMode: newMaintenanceVal };
          if (firestore) {
            setDoc(doc(firestore, "settings", "general"), updated, { merge: true })
              .then(() => {
                toast({
                  title: newMaintenanceVal ? "Sito in Standby 🚧" : "Sito Attivo ✅",
                  description: newMaintenanceVal 
                    ? "Il modulo di tesseramento pubblico è stato messo in standby per manutenzione." 
                    : "Il modulo di tesseramento pubblico è ora attivo e accessibile.",
                });
              })
              .catch(() => {
                toast({
                  title: "Errore",
                  description: "Impossibile aggiornare lo stato di standby.",
                  variant: "destructive"
                });
              });
          }
          return updated;
        });
      }
    } else {
      toast({
        title: "Password Errata",
        description: "La password di sicurezza inserita non è corretta.",
        variant: "destructive"
      });
    }
  };

  const handleMergeDuplicates = async () => {
    if (!firestore) return;
    setIsMergingDuplicates(true);
    try {
      const snap = await getDocs(collection(firestore, "members"));
      const allMembers: Socio[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Socio));

      const groups = new Map<string, Socio[]>();
      allMembers.forEach(socio => {
        const key = `${(socio.firstName || '').toLowerCase().trim()}_${(socio.lastName || '').toLowerCase().trim()}_${socio.birthDate || ''}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(socio);
      });

      const duplicateGroups = Array.from(groups.values()).filter(g => g.length > 1);

      if (duplicateGroups.length === 0) {
        toast({ title: "Nessun duplicato", description: "Tutti i soci hanno combinazioni univoche di nome, cognome e data di nascita." });
        return;
      }

      const batch = writeBatch(firestore);
      let mergeCount = 0;
      const todayStr = new Date().toLocaleDateString('it-IT');

      duplicateGroups.forEach(group => {
        const sorted = [...group].sort((a, b) => {
          const sA = getStatus(a, true); const sB = getStatus(b, true);
          if (sA === 'active' && sB !== 'active') return -1;
          if (sB === 'active' && sA !== 'active') return 1;
          const yA = parseInt(a.membershipYear || '0', 10);
          const yB = parseInt(b.membershipYear || '0', 10);
          if (yA !== yB) return yB - yA;
          const safe = (v: any) => { const p = parseDate(v); return p ? p.getTime() : 0; };
          return safe(b.joinDate || b.submittedAt) - safe(a.joinDate || a.submittedAt);
        });

        const main = sorted[0];
        const dups = sorted.slice(1);
        let oldestJoin = main.joinDate || '';
        let oldestReq = main.requestDate || '';
        let notes = main.notes || '';

        dups.forEach(dup => {
          const dj = parseDate(dup.joinDate); const oj = parseDate(oldestJoin);
          if (dj && (!oj || dj < oj)) oldestJoin = dup.joinDate || '';
          const dr = parseDate(dup.requestDate); const or2 = parseDate(oldestReq);
          if (dr && (!or2 || dr < or2)) oldestReq = dup.requestDate || '';
          const dupNotes = dup.notes ? `\nNote precedenti: ${dup.notes}` : '';
          const info = `[UNIONE DUPLICATO ${todayStr}]: Unita scheda ID ${dup.id}, tessera ${dup.tessera || 'N/D'} (Anno ${dup.membershipYear || 'N/D'}), iscritto il ${formatDate(dup.joinDate) || 'N/D'}.${dupNotes}`;
          notes = `${notes}\n\n${info}`.trim();
          batch.delete(doc(firestore!, "members", dup.id));
        });

        const upd: any = { notes };
        if (!main.renewalDate && main.joinDate) upd.renewalDate = main.joinDate;
        if (oldestJoin && oldestJoin !== main.joinDate) upd.joinDate = oldestJoin;
        if (oldestReq && oldestReq !== main.requestDate) upd.requestDate = oldestReq;
        batch.update(doc(firestore!, "members", main.id), upd);
        mergeCount += dups.length;
      });

      await batch.commit();
      toast({
        title: "Unione Completata!",
        description: `Uniti con successo ${mergeCount} soci duplicati.`
      });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Errore durante l'unione", description: e.message, variant: "destructive" });
    } finally {
      setIsMergingDuplicates(false);
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

            {/* Card Standby per Lavori */}
            <Card className="border-amber-500/20 bg-background/50 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  Standby per Lavori (Manutenzione)
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Metti in standby il modulo di tesseramento pubblico per lavori di manutenzione o modifiche temporanee.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-secondary/20">
                  <div className="space-y-0.5 mr-4">
                    <Label className="text-sm font-bold text-foreground">
                      Stato del Tesseramento Online
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {config.maintenanceMode 
                        ? "🚧 Attualmente disattivato (in manutenzione)" 
                        : "✅ Attualmente attivo e aperto al pubblico"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={config.maintenanceMode ? "destructive" : "outline"}
                    onClick={handleToggleMaintenanceClick}
                    className="font-bold gap-2 shrink-0"
                  >
                    {config.maintenanceMode ? (
                      <>
                        <Lock className="w-4 h-4" />
                        Disattiva Standby
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        Attiva Standby
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card Manutenzione Database */}
            <Card className="border-amber-500/20 bg-background/50 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  Manutenzione Database
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Strumenti avanzati per la pulizia e l'integrità dei dati dei soci.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <RefreshCw className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Sana Soci Doppi</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cerca e unisce automaticamente i soci duplicati (stesso nome, cognome e data di nascita).
                        I dati storici vengono conservati nelle note del socio attivo.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={initiateMergeDuplicates}
                    disabled={isMergingDuplicates}
                    variant="outline"
                    className="w-full border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                  >
                    {isMergingDuplicates ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    {isMergingDuplicates ? "Unione in corso..." : "Esegui Sana Soci Doppi"}
                  </Button>
                </div>
              </CardContent>
            </Card>

          </div>
        </AuthGuard>
        )}
      </main>

      <Dialog open={isSecurityDialogOpen} onOpenChange={setIsSecurityDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" aria-describedby={undefined}>
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
      <BuildFooter />
    </div>
  );
}
