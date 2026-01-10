
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createRoot } from "react-dom/client";

import { collection } from "firebase/firestore";
import { Filter, Loader2, UserPlus, Users, ChevronLeft, ArrowRight, MoreVertical, Printer, Pencil, Trash2, CheckCircle, RefreshCw } from "lucide-react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


import type { Socio } from "@/lib/soci-data";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";

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
      
      let valA: string | number = '';
      let valB: string | number = '';

      if (key === 'name') {
        valA = getFullName(a);
        valB = getFullName(b);
      } else if (key === 'status') {
        valA = getStatus(a);
        valB = getStatus(b);
      } else if (key === 'tessera' || key === 'tessera_mobile') {
        valA = parseInt(a.tessera?.split('-').pop() || '0', 10);
        valB = parseInt(b.tessera?.split('-').pop() || '0', 10);
      } else {
        const aValue = a[key as keyof Socio];
        const bValue = b[key as keyof Socio];
        valA = typeof aValue === 'string' ? aValue.toLowerCase() : (aValue as any);
        valB = typeof bValue === 'string' ? bValue.toLowerCase() : (bValue as any);
      }
      
      if (valA < valB) return asc ? -1 : 1;
      if (valA > valB) return asc ? 1 : -1;
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

  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [editingSocio, setEditingSocio] = useState<Socio | null>(null);

  const initialTab = searchParams.get("tab") || "active";
  const initialFilter = searchParams.get("filter") || "";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "lastName", direction: "ascending" });
  const [filter, setFilter] = useState(initialFilter);
  const [currentPage, setCurrentPage] = useState(1);

  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [socioToPrint, setSocioToPrint] = useState<Socio | null>(null);

  const membersQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, "members") : null), [
    firestore,
    user,
  ]);
  const requestsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, "membership_requests") : null),
    [firestore, user]
  );

  const { data: membersData, isLoading: isMembersLoading, forceRefresh: forceMembersRefresh } =
    useCollection<Socio>(membersQuery);

  const { data: requestsData, isLoading: isRequestsLoading, forceRefresh: forceRequestsRefresh } =
    useCollection<Socio>(requestsQuery);

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

  useEffect(() => {
    if (!isUserLoading && !user) router.push("/login");
  }, [user, isUserLoading, router]);

  const isLoading = isUserLoading || isMembersLoading || isRequestsLoading;

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

  if (isUserLoading || !user) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
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
        {isLoading && !membersData && !requestsData ? (
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

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                  <div className="relative w-full sm:max-w-md">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filtra per nome, tessera..."
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                      className="pl-10"
                    />
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
