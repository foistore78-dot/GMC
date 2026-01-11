
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createRoot } from "react-dom/client";

import { collection } from "firebase/firestore";
import { Filter, Loader2, UserPlus, Users, ChevronLeft, ArrowRight, FileUp, FileDown } from "lucide-react";

import { SociTable, type SortConfig, getStatus, formatDate, getFullName } from "@/components/soci-table";
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

import type { Socio } from "@/lib/soci-data";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/excel-export";
import { importFromExcel, type ImportResult } from "@/lib/excel-import";
import { Separator } from "@/components/ui/separator";

const ITEMS_PER_PAGE = 10;

const filterAndSortData = (
  data: Socio[] | null,
  searchFilter: string,
  sortConfig: SortConfig
): Socio[] => {
    if (!data) return [];

    let filteredData = [...data];

    // 1. Filtering
    if (searchFilter) {
      const lowerCaseFilter = searchFilter.toLowerCase();
      filteredData = filteredData.filter(item => {
          const fullName = getFullName(item).toLowerCase();
          const email = (item.email || '').toLowerCase();
          const tessera = (item.tessera || '').toLowerCase();
          return fullName.includes(lowerCaseFilter) || email.includes(lowerCaseFilter) || tessera.includes(lowerCaseFilter);
        });
    }

    // 2. Sorting
    filteredData.sort((a, b) => {
      const { key, direction } = sortConfig;
      const asc = direction === 'ascending';
      
      let aVal: any = a[key as keyof Socio];
      let bVal: any = b[key as keyof Socio];

      if (key === 'name') {
        const nameA = getFullName(a);
        const nameB = getFullName(b);
        return nameA.localeCompare(nameB) * (asc ? 1 : -1);
      }
      
      if (key === 'tessera' || key === 'tessera_mobile') {
        const numA = parseInt((a.tessera || '').split('-').pop() ?? '0', 10);
        const numB = parseInt((b.tessera || '').split('-').pop() ?? '0', 10);
        if (numA < numB) return asc ? -1 : 1;
        if (numA > numB) return asc ? 1 : -1;
        return 0;
      }
      
      // Fallback for other keys
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
    <span className="text-sm text-muted-foreground">
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

  const firestore = useFirestore();

  const [editingSocio, setEditingSocio] = useState<Socio | null>(null);

  const initialTab = searchParams.get("tab") || "active";
  const initialFilter = searchParams.get("filter") || "";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "lastName", direction: "ascending" });
  const [filter, setFilter] = useState(initialFilter);
  const [currentPage, setCurrentPage] = useState(1);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [socioToPrint, setSocioToPrint] = useState<Socio | null>(null);

  const membersQuery = useMemoFirebase(() => (firestore ? collection(firestore, "members") : null), [
    firestore,
  ]);
  const requestsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, "membership_requests") : null),
    [firestore]
  );

  const { data: membersData, isLoading: isMembersLoading, forceRefresh: forceMembersRefresh } =
    useCollection<Socio>(membersQuery);

  const { data: requestsData, isLoading: isRequestsLoading, forceRefresh: forceRequestsRefresh } =
    useCollection<Socio>(requestsQuery);
    
  const isDataLoading = isMembersLoading || isRequestsLoading;

  const { paginatedData, totalPages, counts } = useMemo(() => {
    const allMembers = membersData || [];
    const allRequests = requestsData || [];
    
    const activeMembers = allMembers.filter((s) => getStatus(s) === "active");
    const expiredMembers = allMembers.filter((s) => getStatus(s) === "expired");
    const pendingRequests = allRequests.filter((req) => getStatus(req) === "pending");

    const counts = {
        active: activeMembers.length,
        expired: expiredMembers.length,
        requests: pendingRequests.length,
    };

    let dataForTab: Socio[];
    if (activeTab === 'active') {
      dataForTab = activeMembers;
    } else if (activeTab === 'expired') {
      dataForTab = expiredMembers;
    } else { // requests
      dataForTab = pendingRequests;
    }

    const sorted = filterAndSortData(dataForTab, filter, sortConfig);
    
    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
    const paginatedData = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
    setActiveTab(tab);
    setCurrentPage(1);

    if (tab === "requests") setSortConfig({ key: "requestDate", direction: "descending" });
    else setSortConfig({ key: "lastName", direction: "ascending" });
  };

  const handleSocioUpdate = useCallback(
    (switchToTab?: "active" | "expired" | "requests") => {
      forceMembersRefresh();
      forceRequestsRefresh();
      if (switchToTab) setActiveTab(switchToTab);
    },
    [forceMembersRefresh, forceRequestsRefresh]
  );

  const handlePrintCard = (socio: Socio) => {
    setSocioToPrint(socio);
    setShowPrintDialog(true);
  };

  const executePrint = () => {
    if (!socioToPrint) return;

    const printWindow = window.open("", "_blank", "height=800,width=800");
    if (!printWindow) {
      alert("Please allow pop-ups for this website");
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

  const handleExport = () => {
    const members = (membersData as Socio[]) || [];
    const requests = (requestsData as Socio[]) || [];
    exportToExcel(members, requests);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && firestore) {
      setIsImporting(true);
      try {
        const result: ImportResult = await importFromExcel(file, firestore);
        const { createdCount, updatedTessere, errorCount } = result;
        
        let description = `Creati ${createdCount} nuovi soci. Aggiornati ${updatedTessere.length} soci esistenti.`;
        if (errorCount > 0) {
          description += ` ${errorCount} righe con errori sono state saltate.`;
        }

        toast({
          title: "Importazione Completata",
          description: description,
          duration: 8000,
        });

        forceMembersRefresh();
        forceRequestsRefresh();

      } catch (error) {
        console.error("Import error:", error);
        toast({
          title: "Errore durante l'importazione",
          description: (error as Error).message || "Si è verificato un problema.",
          variant: "destructive",
        });
      } finally {
        setIsImporting(false);
        if(fileInputRef.current) fileInputRef.current.value = "";
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

        <div className="flex flex-col items-end gap-2">
          <Button asChild>
            <Link href="/#apply">
              <UserPlus className="mr-2 h-4 w-4" />
              Nuova Iscrizione
            </Link>
          </Button>
        </div>
      </div>

      <div className="bg-background rounded-lg border border-border shadow-lg p-2 sm:p-4">
        {isDataLoading && !membersData && !requestsData ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
                    Attivi ({counts.active})
                  </TabsTrigger>
                  <TabsTrigger
                    value="expired"
                    className="text-xs px-2 sm:text-sm data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-300"
                  >
                    In Attesa di Rinnovo ({counts.expired})
                  </TabsTrigger>
                  <TabsTrigger
                    value="requests"
                    className="text-xs px-2 sm:text-sm data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-300"
                  >
                    Richieste ({counts.requests})
                  </TabsTrigger>
                </TabsList>
                
                <div className="relative w-full sm:max-w-xs">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filtra per nome, tessera..."
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    className="pl-10"
                  />
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
                />
              </TabsContent>
            </Tabs>

            {totalPages > 1 && (
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            )}
          </>
        )}
      </div>

      <Separator className="my-8" />
      
      <div className="bg-secondary p-6 rounded-lg border border-border flex flex-col sm:flex-row items-center justify-center gap-4">
          <p className="text-center text-muted-foreground">Gestione dati soci</p>
          <div className="flex items-center gap-2">
            <Button onClick={handleExport} variant="outline" disabled={isDataLoading}>
                <FileDown className="mr-2 h-4 w-4" />
                Esporta Elenco
            </Button>
            <Button onClick={handleImportClick} disabled={isDataLoading || isImporting}>
                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                {isImporting ? "Importo..." : "Importa da Excel"}
            </Button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".xlsx, .xls"
            />
          </div>
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
    </div>
  );
}

    