"use client";

import { useCallback, useEffect, useMemo, useState, useDeferredValue, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createRoot } from "react-dom/client";
import { collection, onSnapshot, doc, writeBatch, query, limit, orderBy, startAfter, QueryDocumentSnapshot, where, getDocs } from "firebase/firestore";
import { Filter, Loader2, UserPlus, Users, ChevronLeft, ArrowRight, FileDown, AlertTriangle, RefreshCw, X, Trash2, Info, Bell, UserCheck, Printer, Minimize2, Maximize2 } from "lucide-react";

import { SociTable, type SortConfig } from "@/components/soci-table";
import EditSocioForm from "@/components/edit-socio-form";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

import type { Socio } from "@/lib/soci-data";
import { useFirestore, errorEmitter, FirestorePermissionError, useFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/excel-export";
import { Label } from "@/components/ui/label";
import { getStatus, getFullName, parseDate, isOlderThanDays, toTitleCase, cn, normalizeSocioData } from "@/lib/utils";

const ITEMS_PER_PAGE = 50;
const SECURITY_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_SECURITY_PASSWORD || "1978";


const filterAndSortData = (
  data: Socio[] | null,
  searchFilter: string,
  sortConfig: SortConfig,
  activeTab: 'active' | 'expired' | 'requests' | 'rejected'
): Socio[] => {
    if (!data) return [];

    let filteredData = [...data];

    if (searchFilter) {
      const lowerCaseFilter = searchFilter.toLowerCase();
      filteredData = filteredData.filter(item => {
          const fullName = getFullName(item).toLowerCase();
          const email = String(item.email || '').toLowerCase();
          const tessera = String(item.tessera || '').toLowerCase();
          
          return fullName.includes(lowerCaseFilter) || 
                 email.includes(lowerCaseFilter) || 
                 tessera.includes(lowerCaseFilter);
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
        } else if (activeTab === 'expired' || activeTab === 'rejected') {
          aVal = a.joinDate;
          bVal = b.joinDate;
        } else { // requests
          aVal = a.requestDate;
          bVal = b.requestDate;
        }
      } else {
        aVal = a[key as keyof Socio];
        bVal = b[key as keyof Socio];
      }

      if (['renewalDate', 'joinDate', 'requestDate', 'birthDate', 'contextualDate', 'expirationDate'].includes(key)) {
        const dA = parseDate(aVal);
        const dB = parseDate(bVal);
        // Se la data manca (es: serverTimestamp ancora pendente), 
        // la trattiamo come "nuovissima" per farla apparire in cima
        const dateA = dA ? dA.getTime() : Date.now() + 100000;
        const dateB = dB ? dB.getTime() : Date.now() + 100000;
        if (dateA < dateB) return asc ? -1 : 1;
        if (dateA > dateB) return asc ? 1 : -1;
        return 0;
      }

      aVal = String(aVal ?? '');
      bVal = String(bVal ?? '');

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' }) * (asc ? 1 : -1);
      }
      
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
  const { firestore, areServicesAvailable } = useFirebase();

  const [editingSocio, setEditingSocio] = useState<Socio | null>(null);

  const initialTab = (searchParams.get("tab") || "active") as 'active' | 'expired' | 'requests' | 'rejected';

  const initialFilter = searchParams.get("filter") || "";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [sortConfig, setSortConfig] = useState<SortConfig>(() => {
    if (initialTab === "requests") {
      return { key: "contextualDate", direction: "descending" };
    }
    return { key: "tessera", direction: "descending" };
  });
  
  const [filter, setFilter] = useState(initialFilter);
  const deferredFilter = useDeferredValue(filter);
  const [currentPage, setCurrentPage] = useState(1);
  const [showRejectedTab, setShowRejectedTab] = useState(initialTab === 'rejected');
  
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [socioToPrint, setSocioToPrint] = useState<Socio | null>(null);

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [membersData, setMembersData] = useState<Socio[]>([]);
  const [requestsData, setRequestsData] = useState<Socio[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isSecurityDialogOpen, setIsSecurityDialogOpen] = useState(false);
  const [securityPasswordInput, setSecurityPasswordInput] = useState("");
  const [pendingAction, setPendingAction] = useState<'export' | 'cleanup' | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // State for non-blocking approval notifications
  const [activeApprovals, setActiveApprovals] = useState<{id: string, socio: Socio}[]>([]);

  const handleNewApproval = useCallback((socio: Socio) => {
    setActiveApprovals(prev => [...prev, { id: crypto.randomUUID(), socio }]);
  }, []);

  const closeApproval = (id: string) => {
    setActiveApprovals(prev => prev.filter(a => a.id !== id));
  };

  const seenRequestIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef(true);

  useEffect(() => {
    // Se i servizi sono ancora in caricamento, non facciamo nulla
    if (!areServicesAvailable) return;

    if (!firestore) {
        setError("Servizio database non disponibile dopo l'inizializzazione.");
        setIsDataLoading(false);
        return;
    }

    setIsDataLoading(true);
    setError(null);

    // Costruiamo la query in base al filtro
    let membersBaseQuery;
    
    if (deferredFilter.length >= 2) {
        const searchStr = toTitleCase(deferredFilter);
        membersBaseQuery = query(
            collection(firestore, "members"),
            where("lastName", ">=", searchStr),
            where("lastName", "<=", searchStr + "\uf8ff")
        );
    } else {
        membersBaseQuery = query(
            collection(firestore, "members"),
            orderBy("lastName")
        );
    }
    
    // Per le richieste carichiamo tutto (solitamente sono poche)
    const requestsRef = collection(firestore, "membership_requests");

    const unsubscribeMembers = onSnapshot(
      membersBaseQuery,
      (snapshot) => {
        setMembersData(prev => {
            const newMap = new Map(prev.map(m => [m.id, m]));
            snapshot.docChanges().forEach(change => {
                if (change.type === "added" || change.type === "modified") {
                    newMap.set(change.doc.id, normalizeSocioData({ id: change.doc.id, ...change.doc.data() }) as Socio);
                } else if (change.type === "removed") {
                    newMap.delete(change.doc.id);
                }
            });
            return Array.from(newMap.values());
        });
        
        setIsDataLoading(false);
      },
      (err: any) => {
        console.error("Errore listener membri:", err);
        setError(`Errore: ${err.message || "Permessi non validi o sessione scaduta."}`);
        setIsDataLoading(false);
      }
    );

    const unsubscribeRequests = onSnapshot(
      query(requestsRef, orderBy("requestDate", "desc")),
      (snapshot) => {
        setRequestsData(prev => {
            const newMap = new Map(prev.map(r => [r.id, r]));
            snapshot.docChanges().forEach(change => {
                if (change.type === "added" || change.type === "modified") {
                    const newSocio = change.doc.data() as Socio;
                    if (change.type === "added" && !isInitialLoad.current && !seenRequestIds.current.has(change.doc.id)) {
                        toast({
                          title: "Nuova Richiesta!",
                          description: `${getFullName(newSocio)} ha appena inviato una domanda di adesione.`,
                        });
                    }
                    newMap.set(change.doc.id, normalizeSocioData({ id: change.doc.id, ...change.doc.data() }) as Socio);
                } else if (change.type === "removed") {
                    newMap.delete(change.doc.id);
                }
            });
            isInitialLoad.current = false;
            seenRequestIds.current = new Set(Array.from(newMap.keys()));
            return Array.from(newMap.values());
        });
      },
      (err) => {
        console.error("Errore listener richieste:", err);
      }
    );

    return () => {
      unsubscribeMembers();
      unsubscribeRequests();
    };
  }, [firestore, areServicesAvailable, toast]);



  const { paginatedData, totalPages, counts, oldRequests } = useMemo(() => {
    const filterBySearch = (data: Socio[]) => {
        if (!deferredFilter) return data;
        const lowerFilter = deferredFilter.toLowerCase();
        return data.filter(item => {
            const fullName = getFullName(item).toLowerCase();
            const tessera = String(item.tessera || '').toLowerCase();
            return fullName.includes(lowerFilter) || tessera.includes(lowerFilter);
        });
    };

    const filteredMembersSet = filterBySearch(membersData);
    const filteredRequestsSet = filterBySearch(requestsData);

    const filteredActive = filteredMembersSet.filter((s) => getStatus(s, true) === "active");
    const filteredExpired = filteredMembersSet.filter((s) => getStatus(s, true) === "expired");
    const filteredRejected = filteredMembersSet.filter((s) => getStatus(s, true) === "rejected");
    const filteredRequests = filteredRequestsSet.filter((req) => getStatus(req, false) === "pending");

    const counts = {
        active: filteredActive.length,
        expired: filteredExpired.length,
        rejected: filteredRejected.length,
        requests: filteredRequests.length,
    };

    const oldRequests = filteredRequests.filter(req => isOlderThanDays(req.requestDate, 60));

    let dataForTab: Socio[];
    if (activeTab === 'active') {
        dataForTab = filteredActive;
    } else if (activeTab === 'expired') {
        dataForTab = filteredExpired;
    } else if (activeTab === 'rejected') {
        dataForTab = filteredRejected;
    } else { // requests
        dataForTab = filteredRequests;
    }
    
    const sortedData = filterAndSortData(dataForTab, '', sortConfig, activeTab);
    
    const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
    const paginatedData = sortedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return { paginatedData, totalPages, counts, oldRequests };
}, [membersData, requestsData, deferredFilter, activeTab, sortConfig, currentPage]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", activeTab);
    if (filter) params.set("filter", filter);
    else params.delete("filter");

    router.replace(`/admin/elenco?${params.toString()}`, { scroll: false });
    setCurrentPage(1);
  }, [activeTab, filter, router, searchParams]);

  const toggleRejectedTab = () => {
    const newVal = !showRejectedTab;
    setShowRejectedTab(newVal);
    if (!newVal && activeTab === 'rejected') {
        setActiveTab('active');
    }
  };

  const handleEditSocio = (socio: Socio) => setEditingSocio(socio);

  const handleSheetOpenChange = (isOpen: boolean) => {
    if (!isOpen) setEditingSocio(null);
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'active' || tab === 'expired' || tab === 'requests' || tab === 'rejected') {
        setActiveTab(tab as 'active' | 'expired' | 'requests' | 'rejected');
        if (tab === 'requests') {
            setSortConfig({ key: 'contextualDate', direction: 'descending' });
        } else {
            setSortConfig({ key: 'tessera', direction: 'descending' });
        }
    }
    setCurrentPage(1);
  };

  const handleSocioUpdate = useCallback(
    (arg?: "active" | "expired" | "requests" | "rejected" | Socio) => {
      setEditingSocio(null);
      // Solo se l'argomento è una stringa (un tab), cambiamo tab.
      // Se è un oggetto socio (dal salvataggio), non facciamo nulla al tab attivo.
      if (typeof arg === "string") {
          setActiveTab(arg);
      }
    },
    []
  );

  const handlePrintCard = (socio: Socio) => {
    setSocioToPrint(socio);
    setShowPrintDialog(true);
  };

  const executePrint = (socio?: Socio) => {
    const targetSocio = socio || socioToPrint;


    if (!targetSocio) return;

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
      root.render(<SocioCard socio={targetSocio} />);

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

    // Clear print dialog state if it was used
    if (!socio) {
        setShowPrintDialog(false);
        setSocioToPrint(null);
    }


  };

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo(0, 0);
    }
  };
  
  const handleFullExport = async () => {
    if (!firestore) return;
    
    setIsExporting(true);
    try {
      toast({
        title: "Preparazione Export",
        description: "Recupero di tutti i soci dal database... Potrebbe volerci un momento.",
      });

      const membersQuery = query(collection(firestore, "members"), orderBy("lastName"));
      const requestsQuery = query(collection(firestore, "membership_requests"), orderBy("requestDate", "desc"));

      const [membersSnap, requestsSnap] = await Promise.all([
        getDocs(membersQuery),
        getDocs(requestsQuery)
      ]);

      const allMembers = membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Socio));
      const allRequests = requestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Socio));

      await exportToExcel(allMembers, allRequests);
      
      toast({
        title: "Export Completato",
        description: `Esportati ${allMembers.length} soci e ${allRequests.length} richieste.`,
      });
    } catch (e: any) {
      console.error("Errore durante l'export completo:", e);
      toast({
        title: "Errore Export",
        description: "Non è stato possibile recuperare tutti i dati: " + e.message,
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const initiateAction = (action: 'export' | 'cleanup') => {
    setPendingAction(action);
    setSecurityPasswordInput("");
    setIsSecurityDialogOpen(true);
  };

  const verifySecurityPassword = () => {
    if (securityPasswordInput === SECURITY_PASSWORD) {
      setIsSecurityDialogOpen(false);
      const action = pendingAction;
      setPendingAction(null);
      
      if (action === 'export') {
        exportToExcel(membersData, requestsData);
      } else if (action === 'cleanup') {
        handleCleanupOldRequests();
      }
    } else {
      toast({
        title: "Password Errata",
        variant: "destructive"
      });
    }
  };

  const handleCleanupOldRequests = async () => {
    if (!firestore || oldRequests.length === 0) return;
    
    setIsCleaningUp(true);
    try {
        const batch = writeBatch(firestore);
        oldRequests.forEach(req => {
            const docRef = doc(firestore, "membership_requests", req.id);
            batch.delete(docRef);
        });
        
        await batch.commit();
        toast({
            title: "Pulizia Completata",
            description: `Rimosse ${oldRequests.length} richieste scadute.`,
        });
    } catch (e) {
        toast({
            title: "Errore durante la pulizia",
            variant: "destructive"
        });
    } finally {
        setIsCleaningUp(false);
    }
  };

  if (!areServicesAvailable) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Inizializzazione servizi database...</p>
      </div>
    );
  }

  return (
    <div className="flex-grow container mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-4">
          <Users className="w-8 h-8 md:w-10 md:h-10 text-primary" />
          <h1 className="font-headline text-3xl md:text-5xl text-primary">Elenco Soci</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleFullExport} 
                disabled={isDataLoading || isExporting}
            >
                {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                )}
                {isExporting ? "Esportazione..." : "Esporta"}
            </Button>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
                <Link href="/?from=admin#apply">
                <UserPlus className="mr-2 h-4 w-4" />
                Nuova Iscrizione
                </Link>
            </Button>
        </div>
      </div>

      <div className="bg-background rounded-lg border border-border shadow-lg p-2 sm:p-4">
        {isDataLoading ? (
          <div className="flex flex-col justify-center items-center h-64 gap-6 px-10">
            <div className="w-full max-w-sm space-y-4">
              <div className="flex justify-between items-center text-sm font-medium text-primary animate-pulse">
                <span>Caricamento dati in corso...</span>
                <span>Attendere</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-full bg-primary animate-progress-indeterminate" />
              </div>
            </div>
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
                <TabsList className="self-start h-auto p-1 bg-muted/20 gap-2 flex-wrap">
                  <TabsTrigger 
                    value="active" 
                    className="rounded-full px-4 py-1.5 border border-emerald-200 text-emerald-600 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:border-emerald-600 transition-all font-medium"
                  >
                    ATTIVI ({counts.active})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="expired" 
                    className="rounded-full px-4 py-1.5 border border-amber-200 text-amber-600 data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:border-amber-600 transition-all font-medium"
                  >
                    SOSPESI ({counts.expired})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="requests" 
                    className="rounded-full px-4 py-1.5 border border-blue-200 text-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 transition-all font-medium"
                  >
                    RICHIESTE ({counts.requests})
                  </TabsTrigger>
                  {showRejectedTab && (
                    <TabsTrigger 
                      value="rejected" 
                      className="rounded-full px-4 py-1.5 border border-rose-200 text-rose-600 data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:border-rose-600 transition-all font-medium"
                    >
                      RESPINTI ({counts.rejected})
                    </TabsTrigger>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                        "h-8 w-8 ml-auto rounded-full border-rose-200 text-rose-600 hover:bg-rose-50",
                        showRejectedTab ? "bg-rose-600 text-white border-rose-600 hover:bg-rose-700" : ""
                    )}
                    onClick={toggleRejectedTab}
                    title={showRejectedTab ? "Nascondi Respinti" : "Mostra Respinti"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TabsList>
                
                <div className="relative w-full sm:max-w-xs">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filtra..."
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    className="pl-10 pr-10"
                    autoComplete="off"
                  />
                  {filter && (
                    <button onClick={() => setFilter("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="h-4 w-4" /></button>
                  )}
                </div>
              </div>

              <TabsContent value="active">
                <SociTable soci={paginatedData} onEdit={handleEditSocio} onPrint={handlePrintCard} allMembers={membersData} onSocioUpdate={handleSocioUpdate} sortConfig={sortConfig} setSortConfig={setSortConfig} activeTab="active" onNewApproval={handleNewApproval} />
              </TabsContent>

              <TabsContent value="expired">
                <SociTable soci={paginatedData} onEdit={handleEditSocio} onPrint={handlePrintCard} allMembers={membersData} onSocioUpdate={handleSocioUpdate} sortConfig={sortConfig} setSortConfig={setSortConfig} activeTab="expired" onNewApproval={handleNewApproval} />
              </TabsContent>

              <TabsContent value="rejected">
                <SociTable soci={paginatedData} onEdit={handleEditSocio} onPrint={handlePrintCard} allMembers={membersData} onSocioUpdate={handleSocioUpdate} sortConfig={sortConfig} setSortConfig={setSortConfig} activeTab="rejected" onNewApproval={handleNewApproval} />
              </TabsContent>

              <TabsContent value="requests" className="space-y-4">
                {oldRequests.length > 0 && (
                    <Alert className="bg-orange-500/10 border-orange-500/30">
                        <Info className="h-4 w-4 text-orange-500" />
                        <AlertTitle>Richieste vecchie</AlertTitle>
                        <AlertDescription className="flex justify-between items-center">
                            <span>Ci sono {oldRequests.length} richieste più vecchie di 60 giorni.</span>
                            <Button variant="outline" size="sm" onClick={() => initiateAction('cleanup')} disabled={isCleaningUp}>Pulisci ora</Button>
                        </AlertDescription>
                    </Alert>
                )}
                <SociTable soci={paginatedData} onEdit={handleEditSocio} onPrint={handlePrintCard} allMembers={membersData} onSocioUpdate={handleSocioUpdate} sortConfig={sortConfig} setSortConfig={setSortConfig} activeTab="requests" onNewApproval={handleNewApproval} />
              </TabsContent>
            </Tabs>
            

            {totalPages > 1 && <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />}
          </>
        )}
      </div>

      <Sheet open={!!editingSocio} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl p-0" closeText="CHIUDI">
          {editingSocio && (
            <EditSocioForm 
                socio={editingSocio} 
                onClose={handleSocioUpdate} 
                isFromMembersCollection={activeTab !== 'requests'} 
                onNewApproval={handleNewApproval}
              />
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Stampa Scheda</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => executePrint()}>Stampa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isSecurityDialogOpen} onOpenChange={setIsSecurityDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Verifica Password</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            {/* Hidden inputs to capture browser autofill and prevent it from affecting the main search */}
            <div className="sr-only" aria-hidden="true" style={{ display: 'none' }}>
              <input type="text" name="username" tabIndex={-1} autoComplete="username" />
              <input type="password" name="password" tabIndex={-1} autoComplete="current-password" />
            </div>
            
            <Label htmlFor="security-password">Inserisci password di sicurezza</Label>
            <Input 
              id="security-password"
              type="password" 
              value={securityPasswordInput} 
              onChange={(e) => setSecurityPasswordInput(e.target.value)}
              autoComplete="new-password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') verifySecurityPassword();
              }}
              autoFocus
            />
          </div>
          <DialogFooter><Button onClick={verifySecurityPassword}>Conferma</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Approval Popups Container */}
      <div className="fixed inset-0 pointer-events-none z-[9999]">
          {activeApprovals.map((approval, index) => (
              <ApprovalPopup 
                key={approval.id} 
                socio={approval.socio} 
                onClose={() => closeApproval(approval.id)} 
                onPrint={() => executePrint(approval.socio)}
                index={index}
              />
          ))}
      </div>
    </div>
  );
}

// Draggable Approval Popup Component
function ApprovalPopup({ socio, onClose, onPrint, index }: { socio: Socio, onClose: () => void, onPrint: () => void, index: number }) {
    const [position, setPosition] = useState({ x: 20, y: 100 + (index * 60) });
    const [dragging, setDragging] = useState(false);
    const [rel, setRel] = useState({ x: 0, y: 0 }); // relative mouse position within the header
    const [isMinimized, setIsMinimized] = useState(false);

    const onMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setDragging(true);
        setRel({
            x: e.pageX - position.x,
            y: e.pageY - position.y
        });
        e.stopPropagation();
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!dragging) return;
            setPosition({
                x: e.pageX - rel.x,
                y: e.pageY - rel.y
            });
            e.stopPropagation();
            e.preventDefault();
        };

        const onMouseUp = () => {
            setDragging(false);
        };

        if (dragging) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [dragging, rel]);

    if (isMinimized) {
        return (
             <div 
                style={{ left: `${position.x}px`, top: `${position.y}px`, position: 'fixed' }}
                className="pointer-events-auto flex items-center gap-2 bg-card border-2 border-primary shadow-xl rounded-full p-1 pr-3 animate-in fade-in zoom-in duration-300 select-none"
             >
                <div 
                    onMouseDown={onMouseDown} 
                    className="bg-primary text-primary-foreground rounded-full p-2 cursor-move hover:bg-primary/90 transition-colors"
                    title="Trascina"
                >
                    <UserCheck className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold px-1 truncate max-w-[150px]">
                    {getFullName(socio)} <span className="text-primary ml-1 opacity-80">#{socio.tessera ? socio.tessera.split('-').pop() : '?'}</span>
                </span>
                <button onClick={() => setIsMinimized(false)} className="text-muted-foreground hover:text-primary transition-colors p-1" title="Espandi">
                    <Maximize2 className="h-4 w-4" />
                </button>
                <button onClick={onClose} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Chiudi">
                    <X className="h-4 w-4" />
                </button>
             </div>
        );
    }

    return (
        <div 
            style={{ 
                left: `${position.x}px`, 
                top: `${position.y}px`,
                position: 'fixed'
            }}
            className="pointer-events-auto bg-card border-2 border-primary shadow-2xl rounded-xl w-80 overflow-hidden animate-in fade-in zoom-in duration-300 select-none"
        >
            {/* Header / Drag Handle */}
            <div 
                onMouseDown={onMouseDown}
                className="bg-primary p-3 flex items-center justify-between cursor-move"
            >
                <div className="flex items-center gap-2 text-primary-foreground font-bold uppercase text-xs tracking-widest">
                    <UserCheck className="h-4 w-4" /> Nuovo Socio Approvato
                </div>
                <div className="flex gap-1">
                    <button onClick={() => setIsMinimized(true)} className="text-primary-foreground/80 hover:text-white transition-colors p-1">
                        <Minimize2 className="h-4 w-4" />
                    </button>
                    <button onClick={onClose} className="text-primary-foreground/80 hover:text-white transition-colors p-1">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
                <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Nome e Cognome</p>
                    <p className="text-xl font-headline text-primary uppercase leading-tight">{getFullName(socio)}</p>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-primary/70 tracking-widest">Numero di Tessera</p>
                    <p className="text-2xl font-mono font-bold text-primary tracking-tighter">{socio.tessera || 'N/A'}</p>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button variant="default" className="flex-1 gap-2" size="sm" onClick={onPrint}>
                        <Printer className="h-4 w-4" /> Stampa
                    </Button>
                    <Button variant="outline" className="flex-1" size="sm" onClick={onClose}>
                        Chiudi
                    </Button>
                </div>
            </div>
            
            {/* Subtle info text */}
            <div className="bg-muted/30 px-5 py-2 text-[9px] text-muted-foreground border-t italic">
                Sposta o riduci a icona per continuare a lavorare.
            </div>
        </div>
    );
}