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
import { Skeleton } from "@/components/ui/skeleton";
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
import { Checkbox } from "@/components/ui/checkbox";
import { QUALIFICHE } from "@/lib/soci-data";

const ITEMS_PER_PAGE = 50;
const SECURITY_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_SECURITY_PASSWORD || "1978";

// Helper to play a notification beep and vibrate device
const playNotificationFeedback = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    // Physical vibration if supported (mobile)
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  } catch (e) {
    console.warn("Feedback not supported or blocked", e);
  }
};


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
  <div className="flex items-center justify-center gap-4 mt-8 pb-4">
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

const TableSkeleton = () => (
  <div className="space-y-3 w-full animate-pulse">
    <div className="h-10 w-full bg-muted rounded-md" />
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 w-full bg-muted/50 rounded-md" />
      ))}
    </div>
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
    playNotificationFeedback();
  }, []);

  const closeApproval = (id: string) => {
    setActiveApprovals(prev => prev.filter(a => a.id !== id));
  };
  
  // State for non-blocking request notifications
  const [activeRequests, setActiveRequests] = useState<{id: string, socio: Socio}[]>([]);
  
  const handleNewRequestPopup = useCallback((socio: Socio) => {
    setActiveRequests(prev => [...prev, { id: crypto.randomUUID(), socio }]);
    playNotificationFeedback();
  }, []);
  
  const closeRequestPopup = (id: string) => {
    setActiveRequests(prev => prev.filter(r => r.id !== id));
  };

  // Approval Dialog States for Popups
  const [approvingSocio, setApprovingSocio] = useState<Socio | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approveMemberNumber, setApproveMemberNumber] = useState("");
  const [approveMembershipFee, setApproveMembershipFee] = useState(10);
  const [approveQualifiche, setApproveQualifiche] = useState<string[]>([]);
  const [approveFeePaid, setApproveFeePaid] = useState(false);
  const [requestPopupIdToClose, setRequestPopupIdToClose] = useState<string | null>(null);

  const getNextMemberNumberForYear = useCallback((year: number) => {
    const yearMemberNumbers = membersData
      .filter(m => m.membershipYear === String(year) && m.tessera && m.status !== 'rejected')
      .map(m => parseInt(String(m.tessera!).split('-').pop() || '0', 10))
      .filter(n => !isNaN(n) && n > 0);
    
    yearMemberNumbers.sort((a, b) => a - b);
    
    let nextNum = 1;
    for (const num of yearMemberNumbers) {
        if (num === nextNum) {
            nextNum++;
        } else if (num > nextNum) {
            break;
        }
    }
    return nextNum;
  }, [membersData]);

  useEffect(() => {
    if (approvingSocio) {
      const currentYear = new Date().getFullYear();
      const nextNumber = getNextMemberNumberForYear(currentYear);
      
      setApproveMemberNumber(String(nextNumber));
      setApproveMembershipFee(isOlderThanDays(approvingSocio.birthDate, 18 * 365) ? 10 : 0);
      setApproveQualifiche(approvingSocio.qualifica || []);
      setApproveFeePaid(false);
    }
  }, [approvingSocio, getNextMemberNumberForYear]);

  const handleApproveFromPopup = async () => {
    if (!firestore || !approvingSocio || isApproving || !approveFeePaid) return;

    setIsApproving(true);
    try {
      const currentYear = new Date().getFullYear();
      const membershipCardNumber = `GMC-${currentYear}-${approveMemberNumber}`;
      const batch = writeBatch(firestore);

      const requestDocRef = doc(firestore, "membership_requests", approvingSocio.id);
      const memberDocRef = doc(firestore, "members", approvingSocio.id);

      const { status, ...restOfSocio } = approvingSocio;
      
      const newMemberData: Socio = {
          ...restOfSocio,
          id: approvingSocio.id,
          joinDate: new Date().toISOString(),
          status: 'active' as const,
          expirationDate: new Date(currentYear, 11, 31).toISOString(),
          membershipYear: String(currentYear),
          tessera: membershipCardNumber,
          membershipFee: approveMembershipFee,
          qualifica: approveQualifiche,
          requestDate: approvingSocio.requestDate || new Date().toISOString(),
          notes: approvingSocio.notes || '', 
      };

      batch.set(memberDocRef, newMemberData, { merge: true });
      batch.delete(requestDocRef);

      await batch.commit();
      
      toast({
          title: "Socio Approvato!",
          description: `${getFullName(approvingSocio)} è ora un membro attivo. N. tessera: ${membershipCardNumber}`,
      });

      // Se c'è un popup da chiudere (perché veniamo da lì)
      if (requestPopupIdToClose) {
        closeRequestPopup(requestPopupIdToClose);
        setRequestPopupIdToClose(null);
      }

      setApprovingSocio(null);
      handleSocioUpdate('active');
    } catch (error: any) {
      toast({
          title: "Errore di Approvazione",
          description: `Impossibile approvare ${getFullName(approvingSocio)}. Dettagli: ${error.message}`,
          variant: "destructive",
      });
    }
  };

  const handleQualificaChange = (qualifica: string, checked: boolean) => {
    setApproveQualifiche(prev => 
      checked ? [...prev, qualifica] : prev.filter(q => q !== qualifica)
    );
  };

  const potentialDuplicate = useMemo(() => {
    if (!approvingSocio) return null;
    return membersData.find(m => 
      m.firstName.toLowerCase().trim() === approvingSocio.firstName.toLowerCase().trim() &&
      m.lastName.toLowerCase().trim() === approvingSocio.lastName.toLowerCase().trim() &&
      m.birthDate === approvingSocio.birthDate
    );
  }, [membersData, approvingSocio]);

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
                        handleNewRequestPopup(newSocio);
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

    const oldRequests = filteredRequests.filter(req => isOlderThanDays(req.requestDate, 30));

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
          <h1 className="font-headline text-2xl sm:text-3xl md:text-5xl text-primary uppercase leading-tight">
            Elenco {
              activeTab === 'active' ? 'Soci Attivi' : 
              activeTab === 'expired' ? 'Soci Sospesi' : 
              activeTab === 'requests' ? 'Richieste In Attesa' : 
              'Soci Respinti'
            }
          </h1>
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
        {error ? (
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
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
              {/* Ordered Tabs Container */}
              <div className="w-full sm:w-auto">
                <TabsList className="flex flex-wrap h-auto p-1 bg-muted/20 gap-1 sm:gap-2 w-full sm:w-auto">
                  <TabsTrigger 
                    value="active" 
                    className="flex-1 min-w-[130px] rounded-md px-2 sm:px-4 py-2 border border-emerald-200 text-emerald-600 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:border-emerald-600 transition-all font-medium text-[10px] sm:text-xs"
                  >
                    ATTIVI ({counts.active})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="expired" 
                    className="flex-1 min-w-[130px] rounded-md px-2 sm:px-4 py-2 border border-amber-200 text-amber-600 data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:border-amber-600 transition-all font-medium text-[10px] sm:text-xs"
                  >
                    SOSPESI ({counts.expired})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="requests" 
                    className="flex-1 min-w-[130px] rounded-md px-2 sm:px-4 py-2 border border-blue-200 text-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 transition-all font-medium text-[10px] sm:text-xs"
                  >
                    RICHIESTE ({counts.requests})
                  </TabsTrigger>
                  {showRejectedTab ? (
                    <TabsTrigger 
                      value="rejected" 
                      className="flex-1 min-w-[130px] rounded-md px-2 sm:px-4 py-2 border border-rose-200 text-rose-600 data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:border-rose-600 transition-all font-medium text-[10px] sm:text-xs"
                    >
                      RESPINTI ({counts.rejected})
                    </TabsTrigger>
                  ) : (
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 sm:w-9 rounded-md border-rose-100 text-rose-400 hover:bg-rose-50 ml-1 sm:ml-0"
                        onClick={toggleRejectedTab}
                        title="Mostra Respinti"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {showRejectedTab && (
                     <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 sm:w-9 rounded-md bg-rose-600 text-white border-rose-600 hover:bg-rose-700 ml-1 sm:ml-0"
                        onClick={toggleRejectedTab}
                        title="Nascondi Respinti"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TabsList>
              </div>
              
              <div className="relative w-full sm:max-w-xs">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filtra..."
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  className="pl-10 pr-10 focus-visible:ring-primary h-10"
                  autoComplete="off"
                />
                {filter && (
                  <button onClick={() => setFilter("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="relative min-h-[400px]">
              {isDataLoading && (
                <div className="absolute inset-0 bg-background/50 z-10 flex flex-col items-center justify-start pt-12">
                   <TableSkeleton />
                </div>
              )}

              <TabsContent value="active" className="mt-0 focus-visible:outline-none">
                <SociTable soci={paginatedData} onEdit={handleEditSocio} onPrint={handlePrintCard} allMembers={membersData} onSocioUpdate={handleSocioUpdate} sortConfig={sortConfig} setSortConfig={setSortConfig} activeTab="active" onNewApproval={handleNewApproval} />
              </TabsContent>

              <TabsContent value="expired" className="mt-0 focus-visible:outline-none">
                <SociTable soci={paginatedData} onEdit={handleEditSocio} onPrint={handlePrintCard} allMembers={membersData} onSocioUpdate={handleSocioUpdate} sortConfig={sortConfig} setSortConfig={setSortConfig} activeTab="expired" onNewApproval={handleNewApproval} />
              </TabsContent>

              <TabsContent value="rejected" className="mt-0 focus-visible:outline-none">
                <SociTable soci={paginatedData} onEdit={handleEditSocio} onPrint={handlePrintCard} allMembers={membersData} onSocioUpdate={handleSocioUpdate} sortConfig={sortConfig} setSortConfig={setSortConfig} activeTab="rejected" onNewApproval={handleNewApproval} />
              </TabsContent>

              <TabsContent value="requests" className="mt-0 space-y-4 focus-visible:outline-none">
                {oldRequests.length > 0 && !isDataLoading && (
                    <Alert className="bg-orange-500/10 border-orange-500/30">
                        <Info className="h-4 w-4 text-orange-500" />
                        <AlertTitle>Richieste vecchie</AlertTitle>
                        <AlertDescription className="flex justify-between items-center">
                            <span>Ci sono {oldRequests.length} richieste più vecchie di 30 giorni.</span>
                            <Button variant="outline" size="sm" onClick={() => initiateAction('cleanup')} disabled={isCleaningUp}>Pulisci ora</Button>
                        </AlertDescription>
                    </Alert>
                )}
                <SociTable soci={paginatedData} onEdit={handleEditSocio} onPrint={handlePrintCard} allMembers={membersData} onSocioUpdate={handleSocioUpdate} sortConfig={sortConfig} setSortConfig={setSortConfig} activeTab="requests" onNewApproval={handleNewApproval} />
              </TabsContent>
            </div>

            {totalPages > 1 && !isDataLoading && <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />}
          </Tabs>
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

      <Dialog open={!!approvingSocio} onOpenChange={(open) => !open && setApprovingSocio(null)}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Approva Socio e Completa Iscrizione</DialogTitle>
                <DialogDescription>
                    Stai per approvare <strong className="text-foreground">{approvingSocio ? getFullName(approvingSocio) : ''}</strong> come membro attivo dal pop-up.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
                {potentialDuplicate && (
                  <Alert variant="destructive" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Possibile Duplicato!</AlertTitle>
                    <AlertDescription>
                      Un socio con lo stesso nome, cognome e data di nascita è già presente (Tessera: {potentialDuplicate.tessera || 'N/A'}).
                    </AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                    <Label htmlFor="membership-number-popup" className="sm:text-right">N. Tessera</Label>
                    <div className="col-span-3">
                    <Input
                        id="membership-number-popup"
                        value={`GMC-${new Date().getFullYear()}-${approveMemberNumber}`}
                        onChange={(e) => {
                            const parts = e.target.value.split('-');
                            setApproveMemberNumber(parts[parts.length - 1] || '');
                        }}
                        className="w-40"
                    />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
                    <Label className="sm:text-right pt-2">Qualifiche</Label>
                    <div className="col-span-3 space-y-2">
                        {QUALIFICHE.map((q) => (
                            <div key={q} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`qualifica-${q}-approve-popup`} 
                                    checked={approveQualifiche.includes(q)}
                                    onCheckedChange={(checked) => handleQualificaChange(q, !!checked)}
                                />
                                <label htmlFor={`qualifica-${q}-approve-popup`} className="text-sm font-medium leading-none cursor-pointer">
                                    {q}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                    <Label htmlFor="membership-fee-popup" className="sm:text-right">Quota (€)</Label>
                    <div className="col-span-3 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <Input
                        id="membership-fee-popup"
                        type="number"
                        value={approveMembershipFee}
                        onChange={(e) => setApproveMembershipFee(Number(e.target.value))}
                        className="w-28"
                    />
                        <div className="flex items-center space-x-2">
                        <Checkbox id="fee-paid-approve-popup" checked={approveFeePaid} onCheckedChange={(checked) => setApproveFeePaid(!!checked)} />
                        <Label htmlFor="fee-paid-approve-popup" className="text-sm font-medium cursor-pointer">Quota Versata</Label>
                    </div>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setApprovingSocio(null)}>Annulla</Button>
                <Button onClick={handleApproveFromPopup} disabled={isApproving || !approveFeePaid}>
                    {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Conferma e Salva
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

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
          {activeRequests.map((request, index) => (
              <RequestPopup 
                key={request.id} 
                socio={request.socio} 
                onClose={() => closeRequestPopup(request.id)} 
                onApprove={() => {
                  setApprovingSocio(request.socio);
                  setRequestPopupIdToClose(request.id);
                }}
                index={activeApprovals.length + index}
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
            className="pointer-events-auto bg-card border-2 border-primary shadow-2xl rounded-xl w-80 overflow-hidden animate-in fade-in zoom-in animate-shake duration-300 select-none"
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
// Draggable Request Popup Component (Blue themed)
function RequestPopup({ socio, onClose, onApprove, index }: { socio: Socio, onClose: () => void, onApprove: () => void, index: number }) {
    const [position, setPosition] = useState({ x: 20, y: 100 + (index * 60) });
    const [dragging, setDragging] = useState(false);
    const [rel, setRel] = useState({ x: 0, y: 0 }); 
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

    const displayDate = socio.birthDate ? formatDate(socio.birthDate) : 'N/A';
    const displayPlace = socio.birthPlace || 'N/A';

    if (isMinimized) {
        return (
             <div 
                style={{ left: `${position.x}px`, top: `${position.y}px`, position: 'fixed' }}
                className="pointer-events-auto flex items-center gap-2 bg-card border-2 border-blue-600 shadow-xl rounded-full p-1 pr-3 animate-in fade-in zoom-in duration-300 select-none animate-shake"
             >
                <div 
                    onMouseDown={onMouseDown} 
                    className="bg-blue-600 text-white rounded-full p-2 cursor-move hover:bg-blue-700 transition-colors"
                    title="Trascina"
                >
                    <Bell className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold px-1 truncate max-w-[150px]">
                    Richiesta di {getFullName(socio)}
                </span>
                <button onClick={() => setIsMinimized(false)} className="text-muted-foreground hover:text-blue-600 transition-colors p-1" title="Espandi">
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
            className="pointer-events-auto bg-card border-2 border-blue-600 shadow-2xl rounded-xl w-80 overflow-hidden animate-in fade-in zoom-in animate-shake duration-300 select-none"
        >
            <div 
                onMouseDown={onMouseDown}
                className="bg-blue-600 p-3 flex items-center justify-between cursor-move"
            >
                <div className="flex items-center gap-2 text-white font-bold uppercase text-xs tracking-widest">
                    <Bell className="h-4 w-4" /> Nuova Domanda Adesione
                </div>
                <div className="flex gap-1">
                    <button onClick={() => setIsMinimized(true)} className="text-white/80 hover:text-white transition-colors p-1">
                        <Minimize2 className="h-4 w-4" />
                    </button>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="p-5 space-y-4">
                <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Richiesta di</p>
                    <p className="text-xl font-headline text-blue-600 uppercase leading-tight">{getFullName(socio)}</p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-blue-600/70 tracking-widest">Nato il / a</p>
                    <p className="text-sm font-medium text-blue-900">{displayDate} a {displayPlace}</p>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button variant="default" className="flex-1 bg-blue-600 hover:bg-blue-700 font-bold" size="sm" onClick={onApprove}>
                        APPROVA
                    </Button>
                    <Button variant="outline" className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50" size="sm" onClick={onClose}>
                        IGNORA PER ORA
                    </Button>
                </div>
            </div>
        </div>
    );
}

function formatDate(date: any) {
    if (!date) return 'N/A';
    try {
        const d = parseDate(date);
        return d.toLocaleDateString('it-IT');
    } catch (e) {
        return 'N/A';
    }
}
