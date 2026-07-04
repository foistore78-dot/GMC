"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../elenco/AuthGuard";
import { Header } from "@/components/header";
import { LoadingScreen } from "@/components/loading-screen";
import { useFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { BuildFooter } from "@/components/build-footer";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { 
  HelpCircle, 
  Search, 
  Users, 
  RefreshCw, 
  Printer, 
  Lock, 
  ChevronRight, 
  BookOpen, 
  Info 
} from "lucide-react";

// FAQ Data structured by category
const FAQ_DATA = [
  {
    category: "approvals",
    categoryLabel: "Gestione Soci e Approvazioni",
    icon: Users,
    items: [
      {
        question: "Qual è la differenza tra i tab Attivi, Sospesi, Richieste e Respinti?",
        answer: "• **Attivi**: Mostra i soci in regola con il tesseramento per l'anno in corso. Hanno un numero di tessera assegnato e lo stato attivo.\n\n• **Sospesi**: Mostra i soci il cui tesseramento è scaduto (la scadenza è fissata al 31 dicembre dell'anno di iscrizione/rinnovo).\n\n• **Richieste**: Raccoglie le candidature inviate online dai futuri soci in attesa di approvazione.\n\n• **Respinti**: Contiene le domande esplicitamente rifiutate o rimosse automaticamente a seguito del superamento dei limiti di tempo."
      },
      {
        question: "Come si approva una richiesta di tesseramento?",
        answer: "1. Accedi al tab **Richieste**.\n2. Individua la persona desiderata e clicca sul pulsante **Verifica e Approva**.\n3. Nel pannello che si apre, controlla i dati (ad esempio se è minorenne) e verifica che sia stata firmata la documentazione.\n4. Verifica il pagamento della quota (€10 per maggiorenni, €0 per minorenni).\n5. Specifica il metodo di firma (SMS OTP o Modulo cartaceo) e assegna le qualifiche (es. Musicista, Volontario).\n6. Clicca su **Conferma Approvazione**. La richiesta verrà convertita in un profilo socio attivo, spostata nella raccolta dei soci e le verrà assegnato un numero progressivo di tessera per l'anno corrente (es. `GMC-2026-X`)."
      },
      {
        question: "Come funziona la firma del modulo (SMS OTP vs Modulo Cartaceo)?",
        answer: "• **SMS OTP**: Se l'utente ha completato la richiesta autonomamente da telefono firmando via codice OTP ricevuto per messaggio, il sistema registra automaticamente i metadati della firma (numero di telefono, data, ora e codice univoco).\n\n• **Modulo Cartaceo**: Se la domanda viene raccolta manualmente o stampata per la firma fisica in sede, l'amministratore seleziona 'Mod. cartaceo' al momento dell'approvazione per indicare che la firma fisica è conservata in archivio cartaceo."
      },
      {
        question: "Cosa succede alle richieste in attesa da più di 30 giorni?",
        answer: "Le richieste in attesa da oltre 30 giorni vengono contrassegnate come scadute. Nel tab **Richieste** apparirà una notifica arancione di avviso. Cliccando su **Pulisci ora** ed inserendo la *Password di Sicurezza del Superadmin*, queste vecchie richieste verranno spostate automaticamente nello stato **Respinti** ed eliminate dalla tabella delle richieste in sospeso per mantenere pulito l'archivio."
      }
    ]
  },
  {
    category: "renewals",
    categoryLabel: "Rinnovi e Tesseramenti",
    icon: RefreshCw,
    items: [
      {
        question: "Quando scade l'iscrizione di un socio?",
        answer: "L'iscrizione ha una durata annuale e scade tassativamente il **31 dicembre dell'anno di riferimento**. Ad esempio, un socio iscritto o rinnovato a Febbraio 2026 rimarrà attivo fino al 31/12/2026. A partire dal 1° Gennaio dell'anno successivo, il suo stato passerà automaticamente a **Sospeso** finché non verrà effettuato il rinnovo."
      },
      {
        question: "Come si effettua il rinnovo di un socio scaduto/sospeso?",
        answer: "1. Trova il socio desiderato nel tab **Sospesi** (o cercando in **Attivi** se vuoi rinnovare in anticipo per l'anno successivo).\n2. Clicca sul pulsante **Rinnova** (icona a forma di frecce circolari).\n3. Seleziona l'anno del rinnovo e inserisci il nuovo numero di tessera (calcolato automaticamente in base all'ultimo progressivo disponibile).\n4. Conferma il versamento della quota e seleziona il tipo di firma per il nuovo anno.\n5. Clicca su **Conferma Rinnovo**. Il sistema aggiornerà la data di scadenza (31 dicembre del nuovo anno), lo stato diventerà **Attivo** e verrà aggiunta una nota cronologica contenente i dettagli storici del rinnovo precedente."
      },
      {
        question: "Dove posso visualizzare lo storico dei rinnovi di un socio?",
        answer: "Lo storico è conservato nel campo **Note** della scheda socio. Ad ogni rinnovo, il sistema appende in cima alle note una riga strutturata (es. `--- RINNOVO GG/MM/AAAA --- Anno: 2026. Tessera precedente anno 2025: GMC-2025-15. Quota versata: €10`). Questo permette di tracciare tutta la storia associativa del membro direttamente nella sua scheda."
      }
    ]
  },
  {
    category: "secretary",
    categoryLabel: "Segreteria e Libro Soci",
    icon: Printer,
    items: [
      {
        question: "Cos'è la pagina Segreteria?",
        answer: "La pagina **Segreteria** (accessibile dall'header) serve a visualizzare e generare il **Libro dei Soci Cartaceo**, obbligatorio per gli adempimenti di legge dell'associazione. Mostra l'elenco dei soci attivi ordinati in base al numero di tessera crescente per un intervallo di date selezionato."
      },
      {
        question: "Come si stampa il Libro Soci Ufficiale?",
        answer: "1. Vai alla pagina **Segreteria**.\n2. Imposta l'intervallo di date desiderato (puoi usare le scorciatoie come *Anno in corso* o *Gennaio-Febbraio 2026*).\n3. Clicca sul pulsante **Stampa** in alto a destra.\n4. Si aprirà la finestra di stampa del browser. La pagina applica automaticamente fogli di stile CSS appositi che ottimizzano la tabella in modalità orizzontale (landscape), nascondendo i pulsanti del menu e adattando i margini per una stampa professionale pronta da archiviare."
      },
      {
        question: "Cosa indicano le statistiche mostrate in Segreteria?",
        answer: "In cima alla pagina vengono calcolati in tempo reale i totali relativi all'intervallo selezionato:\n• **Soci Totali**: Numero di membri attivi registrati nel periodo.\n• **Cassa Quote**: La somma totale delle quote associative raccolte (es. €10 a persona per i maggiorenni).\n• **Nuovi Iscritti**: Numero di soci che si sono iscritti per la prima volta.\n• **Rinnovati**: Numero di soci esistenti che hanno rinnovato l'adesione."
      }
    ]
  },
  {
    category: "security",
    categoryLabel: "Strumenti e Sicurezza",
    icon: Lock,
    items: [
      {
        question: "Quali operazioni richiedono la Password di Sicurezza?",
        answer: "Per proteggere i dati sensibili dell'associazione da modifiche accidentali o accessi non autorizzati, alcune operazioni delicate sono protette da una **Password di Sicurezza del Superadmin**:\n• **Esportazione completa dei dati** (tutti i soci e le richieste di sempre).\n• **Pulizia e cancellazione cumulativa** delle vecchie richieste in sospeso (tab Richieste).\n• **Importazione dati da file esterni** (Excel) o unione dei duplicati nella pagina delle impostazioni.\n\n*Nota: Questa password è di uso esclusivo del superadmin e non deve essere condivisa o inserita nei moduli pubblici.*"
      },
      {
        question: "Come posso esportare i dati dei soci?",
        answer: "Puoi esportare i dati in formato Excel (`.xlsx`) in due modi:\n1. Cliccando su **Esporta** nella pagina **Soci** (esporta la lista corrente filtrata).\n2. Cliccando su **Esporta Tutto** nelle **Opzioni** (richiede la Password di Sicurezza del Superadmin) per scaricare l'intero database in un unico foglio di calcolo contenente sia tutti i soci (attivi, sospesi, respinti) sia tutte le richieste pendenti."
      },
      {
        question: "Come si importano i soci da un file Excel esterno?",
        answer: "1. Vai in **Opzioni** (Settings) e scorri fino alla sezione di importazione.\n2. Clicca su **Seleziona File** per caricare il foglio Excel.\n3. Digita la **Password di Sicurezza del Superadmin**.\n4. Clicca su **Importa** per inserire i record o su **Unisci Duplicati** per aggiornare i soci esistenti abbinando il codice fiscale o nome e cognome."
      },
      {
        question: "Come si configurano i link del gruppo WhatsApp?",
        answer: "In **Opzioni**, puoi inserire i link ufficiali di invito ai gruppi WhatsApp dell'associazione (Gruppo 1 e Gruppo 2). Quando i nuovi soci compilano il modulo di iscrizione online e acconsentono a entrare nel gruppo WhatsApp, riceveranno automaticamente questi link nella schermata di conferma per consentire loro di unirsi autonomamente."
      }
    ]
  }
];

export default function FaqPageClient() {
  const router = useRouter();
  const { auth, user, firestore, isUserLoading } = useFirebase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Verification of admin privileges
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

    setIsCheckingAdmin(true);

    const adminEmail = "garage.music.club2024@gmail.com";
    const emailMatch = user.email?.toLowerCase() === adminEmail.toLowerCase();
    
    if (emailMatch) {
      setIsAdmin(true);
      if (typeof window !== 'undefined') sessionStorage.setItem(sessionKey, 'true');
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
        console.error("Errore verifica admin roles:", e);
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
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

  const handleLogout = useCallback(() => {
    if (auth) {
      signOut(auth).then(() => {
        router.push('/');
      });
      setIsAdmin(false);
    }
  }, [auth, router]);

  // Filter FAQs based on search query and category
  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.map(cat => {
      // If a specific category is selected and it doesn't match, return empty items
      if (selectedCategory && cat.category !== selectedCategory) {
        return { ...cat, items: [] };
      }

      const matchingItems = cat.items.filter(item => {
        const matchesQuery = 
          item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.answer.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesQuery;
      });

      return {
        ...cat,
        items: matchingItems
      };
    }).filter(cat => cat.items.length > 0);
  }, [searchQuery, selectedCategory]);

  return (
    <div className="flex flex-col min-h-screen bg-secondary text-white">
      <Header onLogout={isAdmin ? handleLogout : undefined} />
      <main className="flex-grow">
        <AuthGuard isAdmin={isAdmin}>
          {isUserLoading || isCheckingAdmin ? (
            <LoadingScreen 
              fullScreen={false} 
              message="RICONOSCIMENTO SISTEMA" 
              submessage="Verifica autorizzazioni in corso..." 
            />
          ) : (
            <div className="container mx-auto px-4 py-8 max-w-6xl">
              {/* Header Title Section */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/20 rounded-xl border border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
                    <HelpCircle className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                  <div>
                    <h1 className="font-headline text-3xl md:text-5xl text-primary uppercase tracking-tight">
                      Guida & FAQ Admin
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                      Risposte rapide e istruzioni d'uso del pannello Garage Music Club
                    </p>
                  </div>
                </div>
                <div className="relative w-full md:max-w-xs shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca nelle FAQ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 bg-background/50 border-primary/20 focus-visible:ring-primary h-11"
                  />
                </div>
              </div>

              {/* Layout Content */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Category Sidebar Selector */}
                <div className="space-y-2 lg:col-span-1">
                  <div className="font-bold text-xs uppercase text-primary/70 tracking-widest px-3 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Categorie
                  </div>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start font-semibold rounded-xl px-4 py-3 h-auto ${
                      selectedCategory === null 
                        ? "bg-primary/20 text-primary border border-primary/30" 
                        : "hover:bg-white/5 border border-transparent"
                    }`}
                    onClick={() => setSelectedCategory(null)}
                  >
                    Tutte le Categorie
                  </Button>
                  {FAQ_DATA.map((cat) => {
                    const IconComp = cat.icon;
                    return (
                      <Button
                        key={cat.category}
                        variant="ghost"
                        className={`w-full justify-start font-semibold rounded-xl px-4 py-3 h-auto gap-3 ${
                          selectedCategory === cat.category 
                            ? "bg-primary/20 text-primary border border-primary/30" 
                            : "hover:bg-white/5 border border-transparent"
                        }`}
                        onClick={() => setSelectedCategory(cat.category)}
                      >
                        <IconComp className="w-4 h-4 shrink-0" />
                        <span className="truncate">{cat.categoryLabel}</span>
                      </Button>
                    );
                  })}
                </div>

                {/* FAQ Content Section */}
                <div className="lg:col-span-3 space-y-8">
                  {filteredFaqs.length > 0 ? (
                    filteredFaqs.map((categoryGroup) => {
                      const CatIcon = categoryGroup.icon;
                      return (
                        <Card 
                          key={categoryGroup.category} 
                          className="bg-black/30 backdrop-blur-md border-white/5 shadow-2xl rounded-2xl overflow-hidden"
                        >
                          <CardHeader className="bg-primary/5 border-b border-white/5 py-4 px-6 flex flex-row items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                              <CatIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <CardTitle className="text-lg md:text-xl font-headline tracking-wide uppercase text-primary">
                                {categoryGroup.categoryLabel}
                              </CardTitle>
                              <CardDescription className="text-xs text-muted-foreground">
                                {categoryGroup.items.length} {categoryGroup.items.length === 1 ? 'domanda' : 'domande'}
                              </CardDescription>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6">
                            <Accordion type="single" collapsible className="w-full space-y-3">
                              {categoryGroup.items.map((item, idx) => (
                                <AccordionItem 
                                  value={`${categoryGroup.category}-${idx}`} 
                                  key={idx}
                                  className="border border-white/5 rounded-xl px-4 bg-background/20 hover:bg-background/40 transition-colors"
                                >
                                  <AccordionTrigger className="text-left font-semibold text-sm hover:no-underline hover:text-primary py-4 py-3 gap-3">
                                    {item.question}
                                  </AccordionTrigger>
                                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed border-t border-white/5 pt-4 pb-4">
                                    <div className="whitespace-pre-line">
                                      {item.answer}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center bg-black/20 border border-white/5 rounded-2xl">
                      <Info className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                      <p className="font-semibold text-lg text-muted-foreground">Nessun risultato trovato</p>
                      <p className="text-sm text-muted-foreground/60 max-w-sm mt-1">
                        Nessuna FAQ corrisponde ai criteri di ricerca. Prova a inserire parole chiave diverse.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </AuthGuard>
      </main>
      <BuildFooter />
    </div>
  );
}
