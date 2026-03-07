
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createRoot } from "react-dom/client";
import { collection, onSnapshot } from "firebase/firestore";
import { Filter, Loader2, UserPlus, Users, ChevronLeft, ArrowRight, FileUp, FileDown, AlertTriangle, RefreshCw, Lock, X } from "lucide-react";

import { SociTable, type SortConfig, getStatus, getFullName } from "@/components/soci-table";
import { EditSocioForm } from "@/components/edit-socio-form";
import { SocioCard } from "@/components/socio-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { Socio } from "@/lib/soci-data";
import { useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/excel-export";
import { importFromExcel, ImportResult } from "@/lib/excel-import";
import { Label } from "@/components/ui/label";

// Aumentato a 50 per facilitare la ricerca di soci con numeri alti
const ITEMS_PER_PAGE = 50;
const SECURITY_PASSWORD = "1978";

const filterAndSortData = (
  data: Socio[] | null,
  searchFilter: string,
  sortConfig: SortConfig,
  activeTab: 'active' | 'expired' | 'requests'
): Socio[] => {
    if (!data) return [];

    let filteredData = [...data];

    if (searchFilter) {
      const lowerCaseFilter = searchFilter.toLowerCase();
      filteredData = filteredData.filter(item => {
          const fullName = getFullName(item).toLowerCase();
          const email = (item.email || '').toLowerCase();
          const tessera = (item.tessera || '').toLowerCase();
          const fiscalCode = (item.fiscalCode || '').toLowerCase();
          return fullName.includes(lowerCaseFilter) || 
                 email.includes(lowerCaseFilter) || 
                 tessera.includes(lowerCaseFilter) ||
                 fiscalCode.includes(lowerCaseFilter);
        });
    }

    filteredData.sort((a, b) => {
      const { key, direction } = sortConfig;
      const asc = direction === 'ascending';
      
      let aVal: any;
      let bVal: any;

      if (key === 'name') {
        aVal = getFullName(a);
        bVal = getFullName(b);
      } else if (key === 'contextualDate') {
        if (activeTab === 'active') {
          aVal = a.renewalDate || a.joinDate;
          bVal = b.renewalDate || b.joinDate;
        } else if (activeTab === 'expired') {
          aVal = a.joinDate;
          bVal = b.joinDate;
        } else { // requests
          aVal = a.requestDate;
          bVal = b.requestDate;
        }
      } else if (key === 'tessera') {
        const numA = parseInt((a.tessera || '').split('-').pop() ?? '0', 10);
        const numB = parseInt((b.tessera || '').split('-').pop() ?? '0', 10);
        if (numA < numB) return asc ? -1 : 1;
        if (numA > numB) return asc ? 1 : -1;
        return 0;
      }
      else {
        aVal = a[key as keyof Socio];
        bVal = b[key as keyof Socio];
      }

      if (['renewalDate', 'joinDate', 'requestDate', 'birthDate', 'contextualDate'].includes(key)) {
        const dateA = aVal ? new Date(aVal).getTime() : 0;
        const dateB = bVal ? new Date(bVal).getTime() : 0;
        if (dateA < dateB) return asc ? -1 : 1;
        if (dateA > dateB) return asc ? 1 : -1;
        return 0;
      }

      aVal = aVal ?? '';
      bVal = bVal ?? '';

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * (asc ? 1 : -1);
      }
      
      if (aVal < bVal) return asc ? -1 : 1;
      if (aVal > bVal) return asc ? 1 : -1;
      return 0;
    });

    return filteredData;
};

const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => (
  <div className="flex items-center justify-center gap-4 mt-8">
    <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
      <ChevronLeft className="mr-2 h-4 w-4" />
      Indietro
    </Button>
    <span className="text-sm text-muted-foreground font-medium">
      Pagina {currentPage} di {Math.max(1, totalPages)}
    </span>
    <Button
      variant="outline"
      size="sm"
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage >= totalPages}
    >
      Avanti
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  </div>
);

export default function ElencoClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const importFileRef = useRef<HTMLInputElement>(null);

  const firestore = useFirestore();

  const [editingSocio, setEditingSocio] = useState<Socio | null>(null);

  const initialTab = searchParams.get("tab") || "active";
  const initialFilter = searchParams.get("filter") || "";

  const [activeTab, setActiveTab] = useState(initialTab as 'active' | 'expired' | 'requests');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "tessera", direction: "descending" });
  const [filter, setFilter] = useState(initialFilter);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [socioToPrint, setSocioToPrint] = useState<Socio | null>(null);

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [membersData, setMembersData] = useState<Socio[]>([]);
  const [requestsData, setRequestsData] = useState<Socio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Security Password States
  const [isSecurityDialogOpen, setIsSecurityDialogOpen] = useState(false);
  const [securityPasswordInput, setSecurityPasswordInput] = useState("");
  const [pendingAction, setPendingAction] = useState<'import' | 'export' | null>(null);

  useEffect(() => {
    if (!firestore) {
        setError("Servizio database non disponibile.");
        setIsDataLoading(false);
        return;
    }

    setIsDataLoading(true);
    setError(null);

    const membersRef = collection(firestore, "members");
    const requestsRef = collection(firestore, "membership_requests");

    // Sottoscrizione in tempo reale per i membri
    const unsubscribeMembers = onSnapshot(
      membersRef,
      (snapshot) => {
        const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Socio));
        setMembersData(members);
        setIsDataLoading(false);
      },
      (err) => {
        console.error("Errore listener membri:", err);
        const permissionError = new FirestorePermissionError({
          path: membersRef.path,
          operation: 'list'
        });
        errorEmitter.emit('permission-error', permissionError);
        setError("Permessi amministratore non validi o sessione scaduta.");
        setIsDataLoading(false);
      }
    );

    // Sottoscrizione in tempo reale per le richieste
    const unsubscribeRequests = onSnapshot(
      requestsRef,
      (snapshot) => {
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Socio));
        setRequestsData(requests);
      },
      (err) => {
        console.error("Errore listener richieste:", err);
        const permissionError = new FirestorePermissionError({
          path: requestsRef.path,
          operation: 'list'
        });
        errorEmitter.emit('permission-error', permissionError);
      }
    );

    return () => {
      unsubscribeMembers();
      unsubscribeRequests();
    };
  }, [firestore]);


  const { paginatedData, totalPages, counts } = useMemo(() => {
    const allMembers = membersData || [];
    const allRequests = requestsData || [];

    const applyFinalFilter = (data: Socio[]) => filterAndSortData(data, filter, sortConfig, activeTab);
    
    // Conteggi basati sul filtro globale (per vedere quanti soci totali ci sono nelle tab)
    const countActive = allMembers.filter((s) => getStatus(s) === "active").length;
    const countExpired = allMembers.filter((s) => getStatus(s) === "expired").length;
    const countRequests = allRequests.filter((req) => getStatus(req) === "pending").length;

    const counts = {
        active: countActive,
        expired: countExpired,
        requests: countRequests,
    };

    let dataForTab: Socio[];
    if (activeTab === 'active') {
        dataForTab = applyFinalFilter(allMembers.filter((s) => getStatus(s) === "active"));
    } else if (activeTab === 'expired') {
        dataForTab = applyFinalFilter(allMembers.filter((s) => getStatus(s) === "expired"));
    } else { // requests
        dataForTab = applyFinalFilter(allRequests.filter((req) => getStatus(req) === "pending"));
    }
    
    const totalPages = Math.ceil(dataForTab.length / ITEMS_PER_PAGE);
    const paginatedData = dataForTab.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return { paginatedData, totalPages, counts };
}, [membersData, requestsData, filter, activeTab, sortConfig, currentPage]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", activeTab);
    if (filter) params.set("filter", filter);
    else params.delete("filter");

    router.replace(`/admin/elenco?${params.toString()}`, { scroll: false });
    setCurrentPage(1);
  }, [activeTab, filter, router, searchParams]);

  const handleEditSocio = (socio: Socio) => setEditingSocio(socio);

  const handleSheetOpenChange = (isOpen: boolean) => {
    if (!isOpen) setEditingSocio(null);
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'active' || tab === 'expired' || tab === 'requests') {
        setActiveTab(tab);
    }
    setCurrentPage(1);

    if (tab === "requests") {
      setSortConfig({ key: "requestDate", direction: "descending" });
    } else {
      setSortConfig({ key: "tessera", direction: "descending" });
    }
  };

  const handleSocioUpdate = useCallback(
    (switchToTab?: "active" | "expired" | "requests") => {
      if (switchToTab) setActiveTab(switchToTab);
    },
    []
  );

  const handlePrintCard = (socio: Socio) => {
    setSocioToPrint(socio);
    setShowPrintDialog(true);
  };

  const executePrint = () => {
    if (!socioToPrint) return;

    const printWindow = window.open("", "_blank", "height=800,width=800");
    if (!printWindow) {
      alert("Attiva i pop-up per questo sito per stampare la scheda.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>Stampa Scheda Socio</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Roboto:wght@400;500;700&display=swap');
            @media print {
              body { margin: 0; -webkit-print-color-adjust: exact; color-adjust: exact; }
            }
            body { font-family: 'Roboto', sans-serif; }
          </style>
        </head>
        <body>
          <div id="print-root"></div>
        </body>
      </html>
    `);
    printWindow.document.close();

    const mount = () => {
      const el = printWindow.document.getElementById("print-root");
      if (!el) return;

      const root = createRoot(el);
      root.render(<SocioCard socio={socioToPrint} />);

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 400);
    };

    if (printWindow.document.readyState === "complete") {
      mount();
    } else {
      printWindow.addEventListener("load", mount, { once: true });
    }

    setShowPrintDialog(false);
    setSocioToPrint(null);
  };

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo(0, 0);
    }
  };
  
  const initiateAction = (action: 'import' | 'export') => {
    setPendingAction(action);
    setSecurityPasswordInput("");
    setIsSecurityDialogOpen(true);
  };

  const verifySecurityPassword = () => {
    if (securityPasswordInput === SECURITY_PASSWORD) {
      setIsSecurityDialogOpen(false);
      if (pendingAction === 'export') {
        handleExport();
      } else if (pendingAction === 'import') {
        importFileRef.current?.click();
      }
      setPendingAction(null);
    } else {
      toast({
        title: "Password Errata",
        description: "La password di sicurezza inserita non è corretta.",
        variant: "destructive"
      });
    }
  };

  const handleExport = () => {
    exportToExcel(membersData, requestsData);
    toast({
        title: "Esportazione Avviata",
        description: "Il download del file Excel inizierà a breve."
    });
  }

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !firestore) {
        return;
    }
    
    setIsImporting(true);

    try {
        const result: ImportResult = await importFromExcel(file, firestore);
        toast({
            title: "Importazione Completata",
            description: `${result.createdCount} nuovi soci creati. ${result.updatedTessere.length} soci aggiornati. Errori: ${result.errorCount}.`,
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
        if (importFileRef.current) {
          importFileRef.current.value = "";
        }
    }
  };

  return (
    <div className="flex-grow container mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-4">
          <Users className="w-8 h-8 md:w-10 md:h-10 text-primary" />
          <h1 className="font-headline text-3xl md:text-5xl text-primary">Elenco Soci</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => initiateAction('export')} disabled={isDataLoading}>
                <FileDown className="mr-2 h-4 w-4" />
                Esporta
            </Button>
            <Button variant="outline" onClick={() => initiateAction('import')} disabled={isImporting}>
                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                Importa
            </Button>
            <input type="file" ref={importFileRef} onChange={handleFileImport} className="hidden" accept=".xlsx, .xls"/>
            <Button asChild>
                <Link href="/?from=admin#apply">
                <UserPlus className="mr-2 h-4 w-4" />
                Nuova Iscrizione
                </Link>
            </Button>
        </div>
      </div>

      <div className="bg-background rounded-lg border border-border shadow-lg p-2 sm:p-4">
        {isDataLoading ? (
          <div className="flex flex-col justify-center items-center h-64 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Caricamento dati dal database...</p>
          </div>
        ) : error ? (
           <div className="flex flex-col justify-center items-center h-64 text-center gap-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <div>
                <p className="text-destructive font-semibold text-lg mb-2">Si è verificato un errore</p>
                <p className="text-muted-foreground max-w-md">{error}</p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4"/>
                Ricarica Pagina
            </Button>
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                <TabsList className="self-start">
                  <TabsTrigger
                    value="active"
                    className="text-xs px-2 sm:text-sm data-[state=active]:bg-green-500/20 data-[state=active]:text-green-300"
                  >
                    ATTIVI ({counts.active})
                  </TabsTrigger>
                  <TabsTrigger
                    value="expired"
                    className="text-xs px-2 sm:text-sm data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-300"
                  >
                    SOSPESI ({counts.expired})
                  </TabsTrigger>
                  <TabsTrigger
                    value="requests"
                    className="text-xs px-2 sm:text-sm data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-300"
                  >
                    RICHIESTE ({counts.requests})
                  </TabsTrigger>
                </TabsList>
                
                <div className="relative w-full sm:max-w-xs flex gap-2">
                  <div className="relative flex-1">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filtra per nome, tessera, CF..."
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                      className="pl-10 pr-10"
                    />
                    {filter && (
                      <button 
                        onClick={() => setFilter("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <TabsContent value="active" className="rounded-lg p-1 sm:p-4">
                <SociTable
                  soci={paginatedData}
                  onEdit={handleEditSocio}
                  onPrint={handlePrintCard}
                  allMembers={membersData || []}
                  onSocioUpdate={handleSocioUpdate}
                  sortConfig={sortConfig}
                  setSortConfig={setSortConfig}
                  activeTab="active"
                />
              </TabsContent>

              <TabsContent value="expired" className="rounded-lg bg-yellow-500/5 p-1 sm:p-4">
                <SociTable
                  soci={paginatedData}
                  onEdit={handleEditSocio}
                  onPrint={handlePrintCard}
                  allMembers={membersData || []}
                  onSocioUpdate={handleSocioUpdate}
                  sortConfig={sortConfig}
                  setSortConfig={setSortConfig}
                  activeTab="expired"
                />
              </TabsContent>

              <TabsContent value="requests" className="rounded-lg bg-orange-500/5 p-1 sm:p-4">
                <SociTable
                  soci={paginatedData}
                  onEdit={handleEditSocio}
                  onPrint={handlePrintCard}
                  allMembers={membersData || []}
                  onSocioUpdate={handleSocioUpdate}
                  sortConfig={sortConfig}
                  setSortConfig={setSortConfig}
                  activeTab="requests"
                />
              </TabsContent>
            </Tabs>

            {totalPages > 1 ? (
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            ) : filter && paginatedData.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Nessun socio trovato con il filtro &quot;{filter}&quot;.
              </div>
            ) : null}
          </>
        )}
      </div>

      <Sheet open={!!editingSocio} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-y-auto min-w-[300px] max-w-[90vw] p-4 sm:p-6">
          {editingSocio && (
            <>
              <SheetHeader>
                <SheetTitle className="truncate pr-8">Modifica: {getFullName(editingSocio)}</SheetTitle>
              </SheetHeader>
              <EditSocioForm
                socio={editingSocio}
                onClose={(updatedTab) => {
                  setEditingSocio(null);
                  handleSocioUpdate(updatedTab);
                }}
              />
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stampa Scheda Socio</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per stampare la scheda per{" "}
              <span className="font-bold">{socioToPrint ? getFullName(socioToPrint) : ""}</span>. Questo aprirà una nuova
              finestra di stampa. Vuoi procedere?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSocioToPrint(null)}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={executePrint}>Stampa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Security Password Dialog */}
      <Dialog open={isSecurityDialogOpen} onOpenChange={setIsSecurityDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Verifica di Sicurezza
            </DialogTitle>
            <DialogDescription>
              Inserisci la password di sicurezza per procedere con l&apos;operazione di {pendingAction === 'export' ? 'esportazione' : 'importazione'} dei dati.
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') verifySecurityPassword();
                }}
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
