"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { 
  Printer, 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Users, 
  FileText, 
  Euro,
  Info,
  ChevronRight,
  FileUp,
  Lock,
  AlertCircle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useFirebase } from "@/firebase";
import { Socio } from "@/lib/soci-data";
import { 
  normalizeSocioData, 
  getFullName, 
  parseDate, 
  getStatus, 
  formatDate,
  formatCurrency,
  isMinorCheck
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { importFromExcel, type ImportResult } from "@/lib/excel-import";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function extractTesseraNumber(tessera: string | undefined): number {
  if (!tessera) return 999999;
  const parts = String(tessera).split(/[\/\-\. ]/);
  const lastPart = parts[parts.length - 1].replace(/\D/g, '');
  const num = parseInt(lastPart, 10);
  return isNaN(num) ? 999999 : num;
}

function getSignatureLabel(socio: Socio): string {
  if (!socio.signatureMetadata) {
    return "Mod. cartaceo";
  }
  const sig = socio.signatureMetadata;
  if (sig.method === 'SMS_OTP') {
    const formattedDate = sig.signedAt ? formatDate(sig.signedAt, 'dd/MM/yyyy') : '';
    return `OTP: ${sig.signerPhone || ''} del ${formattedDate}`;
  }
  return "Mod. cartaceo";
}

const SECURITY_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_SECURITY_PASSWORD || "1978";

export default function SegreteriaClient() {
  const { firestore, areServicesAvailable } = useFirebase();
  const { toast } = useToast();
  const importFileRef = useRef<HTMLInputElement>(null);

  const [membersData, setMembersData] = useState<Socio[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calcolo anno di riferimento per i filtri di default
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);

  // Nuovi stati per importazione e anteprima
  const [showPreview, setShowPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSecurityDialogOpen, setIsSecurityDialogOpen] = useState(false);
  const [securityPasswordInput, setSecurityPasswordInput] = useState("");

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

  // Caricamento dei soci
  useEffect(() => {
    if (!areServicesAvailable || !firestore) {
      if (!areServicesAvailable) {
        setIsMembersLoading(false);
      }
      return;
    }

    setIsMembersLoading(true);
    setError(null);

    const membersQuery = query(
      collection(firestore, "members"),
      orderBy("lastName")
    );

    const unsubscribe = onSnapshot(
      membersQuery,
      (snapshot) => {
        const loadedMembers: Socio[] = [];
        snapshot.forEach((doc) => {
          const socioObj = normalizeSocioData({ id: doc.id, ...doc.data() }) as Socio;
          loadedMembers.push(socioObj);
        });
        setMembersData(loadedMembers);
        setIsMembersLoading(false);
      },
      (err) => {
        console.error("Errore nel caricamento dei soci per la segreteria:", err);
        setError("Errore durante il caricamento dei soci. Verifica i permessi.");
        setIsMembersLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, areServicesAvailable]);

  // Filtraggio e ordinamento in-memory
  const filteredAndSortedMembers = useMemo(() => {
    if (!membersData.length) return [];

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return membersData
      .filter((socio) => {
        // Solo soci attivi
        const isActive = getStatus(socio, true) === 'active';
        if (!isActive) return false;

        // Riferimento data: data di rinnovo (se presente) oppure data di iscrizione
        const dateToCheckStr = socio.renewalDate || socio.joinDate;
        if (!dateToCheckStr) return false;

        const checkDate = parseDate(dateToCheckStr);
        if (!checkDate) return false;

        return checkDate >= start && checkDate <= end;
      })
      .sort((a, b) => {
        // Ordinamento crescente per numero di tessera
        return extractTesseraNumber(a.tessera) - extractTesseraNumber(b.tessera);
      });
  }, [membersData, startDate, endDate]);

  // Calcolo dei totali per il riepilogo
  const stats = useMemo(() => {
    const totalCount = filteredAndSortedMembers.length;
    const totalFees = filteredAndSortedMembers.reduce((sum, socio) => sum + (socio.membershipFee || 0), 0);
    const newMembers = filteredAndSortedMembers.filter(s => !(s.renewalDate && s.renewalDate !== s.joinDate)).length;
    const renewedMembers = totalCount - newMembers;

    return {
      totalCount,
      totalFees,
      newMembers,
      renewedMembers
    };
  }, [filteredAndSortedMembers]);

  // Scorciatoie per filtri rapidi
  const setFilterPreset = (preset: 'jan-feb-2026' | 'current-year' | 'current-month' | 'last-30') => {
    const today = new Date();
    const year = today.getFullYear();

    if (preset === 'jan-feb-2026') {
      setStartDate('2026-01-01');
      setEndDate('2026-02-28');
    } else if (preset === 'current-year') {
      setStartDate(`${year}-01-01`);
      setEndDate(`${year}-12-31`);
    } else if (preset === 'current-month') {
      const firstDay = new Date(year, today.getMonth(), 1);
      const lastDay = new Date(year, today.getMonth() + 1, 0);
      
      const formatLocal = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${d.getFullYear()}-${mm}-${dd}`;
      };

      setStartDate(formatLocal(firstDay));
      setEndDate(formatLocal(lastDay));
    } else if (preset === 'last-30') {
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - 30);
      
      const formatLocal = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${d.getFullYear()}-${mm}-${dd}`;
      };

      setStartDate(formatLocal(pastDate));
      setEndDate(formatLocal(today));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const displayDate = (isoStr: string | undefined) => {
    if (!isoStr) return "";
    return formatDate(isoStr, "dd/MM/yyyy");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Stile CSS specifico per la stampa orizzontale */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 0.8cm;
          }
          html, body {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            background: white !important;
            color: black !important;
          }
          body > *:not(#print-area) {
            display: none !important;
          }
          #print-area {
            display: block !important;
            position: relative !important;
            float: none !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }
          header, footer, nav, button, .print\\:hidden, [role="button"], .no-print {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 15px !important;
            font-size: 10px !important;
            line-height: 1.2 !important;
            background: white !important;
            color: black !important;
          }
          th, td {
            border: 1px solid #000000 !important;
            padding: 4px 6px !important;
            text-align: left !important;
            color: black !important;
            background: white !important;
          }
          th {
            background-color: #f2f2f2 !important;
            font-weight: bold !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* VISTA A SCHERMO (Naturale, non di stampa) */}
      <div className="print:hidden space-y-6">
        {/* Intestazione Pagina */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Link href="/admin/elenco" className="hover:text-primary flex items-center gap-1 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Elenco Soci
              </Link>
              <span>/</span>
              <span>Segreteria</span>
            </div>
            <h1 className="font-headline text-3xl font-bold tracking-wider text-foreground">
              SEGRETERIA
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Generazione e stampa del Libro dei Soci cartaceo
            </p>
          </div>

          <Button 
            onClick={handlePrint}
            disabled={isMembersLoading || filteredAndSortedMembers.length === 0}
            className="w-full sm:w-auto font-bold gap-2 shadow-lg shadow-primary/20"
          >
            <Printer className="w-4 h-4" />
            Stampa Libro Soci
          </Button>
        </div>

        <Tabs defaultValue="libro-soci" className="w-full space-y-6">
          <TabsList className="grid grid-cols-2 max-w-[400px] border border-primary/10 bg-secondary/50">
            <TabsTrigger value="libro-soci" className="font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="w-4.5 h-4.5 mr-2" />
              Libro Soci
            </TabsTrigger>
            <TabsTrigger value="importazione" className="font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileUp className="w-4.5 h-4.5 mr-2" />
              Importa Excel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="libro-soci" className="space-y-6 mt-0">
            {/* Filtri e Riepilogo */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-primary/10 bg-background/50 backdrop-blur-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-headline flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    Filtro Periodo di Approvazione/Rinnovo
                  </CardTitle>
                  <CardDescription>
                    Seleziona le date di inizio e fine per estrarre l'elenco dei soci attivi.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Da Data con Popover + Calendar */}
                    <div className="space-y-1.5 flex flex-col">
                      <Label>Da data</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal bg-secondary/30 border-primary/20 hover:bg-secondary/50"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                            {startDate ? formatDate(startDate) : <span>Seleziona data</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={parseDate(startDate) || undefined}
                            onSelect={(date) => {
                              if (date) {
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                setStartDate(`${year}-${month}-${day}`);
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* A Data con Popover + Calendar */}
                    <div className="space-y-1.5 flex flex-col">
                      <Label>A data</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal bg-secondary/30 border-primary/20 hover:bg-secondary/50"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                            {endDate ? formatDate(endDate) : <span>Seleziona data</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={parseDate(endDate) || undefined}
                            onSelect={(date) => {
                              if (date) {
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                setEndDate(`${year}-${month}-${day}`);
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Scorciatoie */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setFilterPreset('jan-feb-2026')}
                      className={cn(startDate === '2026-01-01' && endDate === '2026-02-28' && "border-primary text-primary")}
                    >
                      Gen - Feb 2026
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setFilterPreset('current-year')}
                      className={cn(startDate === `${currentYear}-01-01` && endDate === `${currentYear}-12-31` && "border-primary text-primary")}
                    >
                      Anno Corrente
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setFilterPreset('current-month')}
                    >
                      Mese Corrente
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setFilterPreset('last-30')}
                    >
                      Ultimi 30 giorni
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Scheda Statistiche / Riepilogo */}
              <Card className="border-primary/10 bg-background/50 backdrop-blur-md flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-headline flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Riepilogo Selezione
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 flex-grow justify-center flex flex-col">
                  {isMembersLoading ? (
                    <div className="space-y-2 py-2">
                      <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm border-b border-border/50 pb-1.5">
                        <span className="text-muted-foreground">Soci Attivi Estratti:</span>
                        <span className="font-bold text-foreground">{stats.totalCount}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-b border-border/50 pb-1.5">
                        <span className="text-muted-foreground">Nuovi Soci (in data range):</span>
                        <span className="font-semibold text-emerald-400">{stats.newMembers}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-b border-border/50 pb-1.5">
                        <span className="text-muted-foreground">Rinnovi (in data range):</span>
                        <span className="font-semibold text-cyan-400">{stats.renewedMembers}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-1">
                        <span className="text-muted-foreground">Totale Quote Versate:</span>
                        <span className="font-bold text-primary flex items-center gap-0.5">
                          <Euro className="w-3.5 h-3.5" />
                          {stats.totalFees.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tabella Anteprima a richiesta */}
            <Card className="border-primary/10 bg-background/50 backdrop-blur-md overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-headline flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Anteprima Libro Soci
                    </CardTitle>
                    <CardDescription>
                      Anteprima della struttura e dei dati che verranno stampati su carta.
                    </CardDescription>
                  </div>
                  {showPreview && !isMembersLoading && filteredAndSortedMembers.length > 0 && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 bg-secondary/50 px-2.5 py-1 rounded-md border border-border">
                      <Info className="w-3 h-3 text-primary" />
                      Ordinamento per numero di tessera crescente.
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className={showPreview ? "p-0" : "p-6"}>
                {!showPreview ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                    <FileText className="w-12 h-12 text-muted-foreground opacity-50" />
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">Anteprima non caricata</p>
                      <p className="text-xs text-muted-foreground max-w-md">
                        Per velocizzare il caricamento della pagina, l'anteprima viene generata solo su richiesta.
                      </p>
                    </div>
                    <Button 
                      onClick={() => setShowPreview(true)}
                      variant="outline"
                      className="mt-2 border-primary/20 hover:bg-primary/10 text-primary font-semibold"
                    >
                      Genera Anteprima Libro Soci
                    </Button>
                  </div>
                ) : isMembersLoading ? (
                  <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Caricamento elenco soci...</span>
                  </div>
                ) : error ? (
                  <div className="p-8 text-center text-destructive">
                    {error}
                  </div>
                ) : filteredAndSortedMembers.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    Nessun socio attivo trovato con approvazione o rinnovo tra il {displayDate(startDate)} e il {displayDate(endDate)}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border/80 bg-secondary/50">
                          <th className="p-3 text-muted-foreground font-semibold w-12">Anno</th>
                          <th className="p-3 text-muted-foreground font-semibold w-16">Tessera</th>
                          <th className="p-3 text-muted-foreground font-semibold">Socio</th>
                          <th className="p-3 text-muted-foreground font-semibold">Nato/a il / a</th>
                          <th className="p-3 text-muted-foreground font-semibold">Codice Fiscale</th>
                          <th className="p-3 text-muted-foreground font-semibold">Residenza</th>
                          <th className="p-3 text-muted-foreground font-semibold">Firma</th>
                          <th className="p-3 text-muted-foreground font-semibold">Tutore</th>
                          <th className="p-3 text-muted-foreground font-semibold w-20">Stato</th>
                          <th className="p-3 text-muted-foreground font-semibold w-20">Quota</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {filteredAndSortedMembers.map((socio) => {
                          const isMinor = isMinorCheck(socio.birthDate);
                          const isRenewal = socio.renewalDate && socio.renewalDate !== socio.joinDate;
                          const tessNum = extractTesseraNumber(socio.tessera);
                          const tutorName = isMinor && (socio.guardianLastName || socio.guardianFirstName)
                            ? `${socio.guardianLastName || ''} ${socio.guardianFirstName || ''}`.trim()
                            : "";

                          return (
                            <tr key={socio.id} className="hover:bg-primary/5 transition-colors">
                              <td className="p-3 font-medium text-foreground">{socio.membershipYear}</td>
                              <td className="p-3 font-semibold text-primary">{tessNum === 999999 ? "" : tessNum}</td>
                              <td className="p-3 font-medium text-foreground">{getFullName(socio)}</td>
                              <td className="p-3 text-muted-foreground">
                                {displayDate(socio.birthDate)} a {socio.birthPlace}
                              </td>
                              <td className="p-3 font-mono text-muted-foreground tracking-wider uppercase">
                                {socio.fiscalCode}
                              </td>
                              <td className="p-3 text-muted-foreground">
                                {socio.address}, {socio.postalCode} {socio.city} ({socio.province})
                              </td>
                              <td className="p-3 text-muted-foreground italic max-w-[150px] truncate" title={getSignatureLabel(socio)}>
                                {getSignatureLabel(socio)}
                              </td>
                              <td className="p-3 text-muted-foreground">
                                {tutorName || (isMinor ? <span className="text-yellow-500/80">Manca Tutore</span> : "-")}
                              </td>
                              <td className="p-3">
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                  isRenewal ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                )}>
                                  {isRenewal ? "RINNOVO" : "NUOVO"}
                                </span>
                              </td>
                              <td className="p-3 text-foreground font-semibold">
                                {formatCurrency(socio.membershipFee)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="importazione" className="mt-0">
            <div className="max-w-2xl">
              <Card className="border-primary/20 bg-background/50 backdrop-blur-md shadow-xl">
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
                      <AlertCircle className="w-5 h-5 shrink-0 text-primary animate-pulse" />
                      <p>Assicurati che il file Excel segua il formato corretto scaricato tramite la funzione "Esporta".</p>
                    </div>
                  </div>
                  <input type="file" onChange={handleFileImport} ref={importFileRef} className="hidden" accept=".xlsx, .xls"/>
                  <Button 
                    onClick={initiateImport} 
                    disabled={isImporting} 
                    variant="default" 
                    className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow-md h-11"
                  >
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                    {isImporting ? "Importazione in corso..." : "Seleziona file Excel"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* VISTA SPECIFICA DI STAMPA CARTACEA (Rendering tramite portal per conformità a globals.css) */}
      {typeof document !== "undefined" && createPortal(
        <div id="print-area" className="hidden print:block print-full-width text-black bg-white">
          {/* Intestazione Formale Associazione */}
          <div className="border-b border-black pb-4 mb-4 text-center">
            <h2 className="text-base font-bold tracking-wider uppercase m-0">
              Associazione Culturale "Garage Music Club"
            </h2>
            <p className="text-[10px] m-1 italic">
              Sede Legale: Via XXIV Udine n. 43, 34072 Gradisca d’Isonzo (GO) — E-mail: garage.music.club2024@gmail.com
            </p>
            <div className="mt-4">
              <h1 className="text-lg font-bold tracking-widest uppercase m-0">
                LIBRO DEI SOCI — ALLEGATO VERBALE DI AMMISSIONE
              </h1>
              <p className="text-[10px] m-1">
                Elenco dei soci attivi con data di ammissione/rinnovo compresa tra il <strong>{displayDate(startDate)}</strong> e il <strong>{displayDate(endDate)}</strong>
              </p>
            </div>
          </div>

          {/* Tabella di Stampa */}
          <table>
            <thead>
              <tr>
                <th style={{ width: '4%' }}>Anno</th>
                <th style={{ width: '6%' }}>N. Tessera</th>
                <th style={{ width: '16%' }}>Cognome e Nome</th>
                <th style={{ width: '14%' }}>Nato/a il / a</th>
                <th style={{ width: '12%' }}>Codice Fiscale</th>
                <th style={{ width: '18%' }}>Residenza</th>
                <th style={{ width: '12%' }}>Firma</th>
                <th style={{ width: '10%' }}>Tutore (Minore)</th>
                <th style={{ width: '5%' }}>Stato</th>
                <th style={{ width: '5%' }}>Quota</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedMembers.map((socio) => {
                const isMinor = isMinorCheck(socio.birthDate);
                const isRenewal = socio.renewalDate && socio.renewalDate !== socio.joinDate;
                const tessNum = extractTesseraNumber(socio.tessera);
                const tutorName = isMinor && (socio.guardianLastName || socio.guardianFirstName)
                  ? `${socio.guardianLastName || ''} ${socio.guardianFirstName || ''}`.trim()
                  : "";

                return (
                  <tr key={socio.id}>
                    <td>{socio.membershipYear}</td>
                    <td style={{ fontWeight: 'bold' }}>{tessNum === 999999 ? "" : tessNum}</td>
                    <td style={{ fontWeight: 'bold' }}>{getFullName(socio)}</td>
                    <td>{displayDate(socio.birthDate)} a {socio.birthPlace}</td>
                    <td style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}>{socio.fiscalCode}</td>
                    <td>{socio.address}, {socio.postalCode} {socio.city} ({socio.province})</td>
                    <td>{getSignatureLabel(socio)}</td>
                    <td>{tutorName || (isMinor ? "Minorenne" : "")}</td>
                    <td>{isRenewal ? "RINNOVO" : "NUOVO"}</td>
                    <td>{formatCurrency(socio.membershipFee)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Sezione Statistiche e Firme in Stampa */}
          <div className="mt-8 grid grid-cols-2 gap-8 text-[10px]">
            <div className="space-y-1">
              <p className="m-0"><strong>Riepilogo Registro:</strong></p>
              <p className="m-0">Totale soci attivi estratti: {stats.totalCount} (di cui Nuovi: {stats.newMembers}, Rinnovi: {stats.renewedMembers})</p>
              <p className="m-0">Totale quote associative riscosse: {formatCurrency(stats.totalFees)}</p>
            </div>
            <div className="flex flex-col items-end justify-end pt-8">
              <div className="text-center w-64 border-t border-black pt-2">
                <p className="m-0 font-bold">Il Presidente dell'Associazione</p>
                <p className="m-0 text-[8px] text-gray-500 italic mt-6">(firma leggibile)</p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

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
    </div>
  );
}
