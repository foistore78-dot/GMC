"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from 'next/link';
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SociTable, type SortConfig, getStatus, formatDate } from "@/components/soci-table";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Loader2, Users, Filter, QrCode } from "lucide-react";
import type { Socio } from "@/lib/soci-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditSocioForm } from "@/components/edit-socio-form";
import { getFullName } from "@/components/soci-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactDOMServer from 'react-dom/server';

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
import { SocioCard } from "@/components/socio-card";

const ITEMS_PER_PAGE = 10;

const getTesseraNumber = (tessera: string | undefined): number => {
  if (!tessera) return Infinity;
  const parts = tessera.split('-');
  if (parts.length < 3) return Infinity;
  const num = parseInt(parts[parts.length - 1], 10);
  return isNaN(num) ? Infinity : num;
};


export default function ElencoSociPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const [editingSocio, setEditingSocio] = useState<Socio | null>(null);
  
  // Use URL state for tabs and filters
  const initialTab = searchParams.get("tab") || "active";
  const initialFilter = searchParams.get("filter") || "";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "tessera", direction: "ascending" });
  
  const [filter, setFilter] = useState(initialFilter);
  const [currentPage, setCurrentPage] = useState(1);

  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [socioToPrint, setSocioToPrint] = useState<Socio | null>(null);

  const membersQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, "members") : null),
    [firestore, user]
  );
  const requestsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, "membership_requests") : null),
    [firestore, user]
  );

  const { data: membersData, isLoading: isMembersLoading } = useCollection<Socio>(membersQuery);
  const { data: requestsData, isLoading: isRequestsLoading } = useCollection<Socio>(requestsQuery);
  
  // Memoize data splitting
  const { allActive, allExpired } = useMemo(() => {
    const allMembers = membersData || [];
    const allActive = allMembers.filter(s => getStatus(s) === 'active');
    const allExpired = allMembers.filter(s => getStatus(s) === 'expired');
    return { allActive, allExpired };
  }, [membersData]);
  

  const filterAndSortData = (data: Socio[], currentSortConfig: SortConfig, searchFilter: string) => {
    if (!data) return [];
    
    // 1. Filter by search string
    const searchedData = searchFilter ? data.filter(socio => {
        const searchString = searchFilter.toLowerCase();
        const fullName = `${socio.firstName || ''} ${socio.lastName || ''}`.toLowerCase();
        const reversedFullName = `${socio.lastName || ''} ${socio.firstName || ''}`.toLowerCase();
        const email = socio.email?.toLowerCase() || '';
        const tessera = socio.tessera?.toLowerCase() || '';
        const birthDate = formatDate(socio.birthDate);

        return (
            fullName.includes(searchString) ||
            reversedFullName.includes(searchString) ||
            email.includes(searchString) ||
            tessera.includes(searchString) ||
            birthDate.includes(searchString)
        );
    }) : data;
    
    // 2. Sort the filtered data
    return [...searchedData].sort((a, b) => {
        const { key, direction } = currentSortConfig;
        let aValue: any;
        let bValue: any;
        
        if (key === 'tessera') {
            const numA = getTesseraNumber(a.tessera);
            const numB = getTesseraNumber(b.tessera);
            aValue = numA;
            bValue = numB;
        } else if (key === 'name') {
            aValue = `${a.lastName} ${a.firstName}`.toLowerCase();
            bValue = `${b.lastName} ${b.firstName}`.toLowerCase();
        } else {
            aValue = a[key as keyof Socio];
            bValue = b[key as keyof Socio];
        }

        const asc = direction === 'ascending';
        if (aValue < bValue) return asc ? -1 : 1;
        if (aValue > bValue) return asc ? 1 : -1;
        return 0;
    });
  };

  const sortedActive = useMemo(() => filterAndSortData(allActive, sortConfig, filter).map(s => ({ ...s, membershipStatus: 'active' as const })), [allActive, sortConfig, filter]);
  const sortedExpired = useMemo(() => filterAndSortData(allExpired, sortConfig, filter).map(s => ({ ...s, membershipStatus: 'expired' as const })), [allExpired, sortConfig, filter]);
  const sortedRequests = useMemo(() => filterAndSortData(requestsData || [], sortConfig, filter).map(s => ({ ...s, membershipStatus: 'pending' as const })), [requestsData, sortConfig, filter]);


  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    if (filter) params.set("filter", filter);
    router.replace(`/admin/elenco?${params.toString()}`, { scroll: false });
    setCurrentPage(1);
  }, [filter, activeTab, router]);


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [user, isUserLoading, router]);

  const isLoading = isUserLoading || isMembersLoading || isRequestsLoading;

  const handleEditSocio = (socio: Socio) => {
    setEditingSocio(socio);
  };
  
  const handleSheetOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setEditingSocio(null);
    }
  };
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setFilter(""); // Reset filter on tab change
    if (tab === 'requests') {
      setSortConfig({ key: 'requestDate', direction: 'descending' });
    } else {
      setSortConfig({ key: 'tessera', direction: 'ascending' });
    }
  };

  const resetToDefaultSort = () => {
    handleTabChange("active");
  };
  
  const handlePrintCard = (socio: Socio) => {
    setSocioToPrint(socio);
    setShowPrintDialog(true);
  };

  const executePrint = () => {
    if (!socioToPrint) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups for this website');
      return;
    }
    
    // Use ReactDOMServer to generate static HTML
    const cardHtml = ReactDOMServer.renderToStaticMarkup(<SocioCard socio={socioToPrint} />);

    printWindow.document.write(`
      <html>
        <head>
          <title>Stampa Scheda Socio</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Roboto:wght@400;500;700&display=swap');
            @media print {
              body { 
                margin: 0; 
                -webkit-print-color-adjust: exact; 
                color-adjust: exact; 
              }
            }
            body { font-family: 'Roboto', sans-serif; }
          </style>
        </head>
        <body>
          ${cardHtml}
        </body>
      </html>
    `);

    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 250); // Small delay to ensure content is rendered

    setShowPrintDialog(false);
    setSocioToPrint(null);
  };


  if (isUserLoading || !user) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
           <div className="flex items-center gap-4">
              <Users className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              <h1 className="font-headline text-3xl md:text-5xl text-primary">
                Elenco Soci
              </h1>
           </div>
           <Button asChild variant="outline">
              <Link href="/segreteria">
                <QrCode className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Area Segreteria</span>
                <span className="sm:hidden">Segreteria</span>
              </Link>
            </Button>
        </div>

        <div className="bg-background rounded-lg border border-border shadow-lg p-2 sm:p-4">
          {isLoading && sortedActive.length === 0 && sortedRequests.length === 0 && sortedExpired.length === 0 ? (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
          ) : (
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                <TabsList className="self-start">
                   <TabsTrigger value="active" className="text-xs sm:text-sm data-[state=active]:bg-green-500/20 data-[state=active]:text-green-300">
                    Attivi
                  </TabsTrigger>
                  <TabsTrigger value="expired" className="text-xs sm:text-sm data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-300">
                    In Attesa di Rinnovo
                  </TabsTrigger>
                  <TabsTrigger value="requests" className="text-xs sm:text-sm data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-300">
                    Richieste
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
                    soci={sortedActive}
                    onEdit={handleEditSocio}
                    onPrint={handlePrintCard}
                    allMembers={membersData || []}
                    onSocioApproved={resetToDefaultSort}
                    onSocioRenewed={resetToDefaultSort}
                    sortConfig={sortConfig}
                    setSortConfig={setSortConfig}
                    itemsPerPage={ITEMS_PER_PAGE}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                />
              </TabsContent>
               <TabsContent value="expired" className="rounded-lg bg-yellow-500/5 p-1 sm:p-4">
                <SociTable 
                    soci={sortedExpired}
                    onEdit={handleEditSocio}
                    onPrint={handlePrintCard}
                    allMembers={membersData || []}
                    onSocioApproved={resetToDefaultSort}
                    onSocioRenewed={resetToDefaultSort}
                    sortConfig={sortConfig}
                    setSortConfig={setSortConfig}
                    itemsPerPage={ITEMS_PER_PAGE}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                />
              </TabsContent>
              <TabsContent value="requests" className="rounded-lg bg-orange-500/5 p-1 sm:p-4">
                <SociTable 
                    soci={sortedRequests}
                    onEdit={handleEditSocio}
                    onPrint={handlePrintCard}
                    allMembers={membersData || []}
                    onSocioApproved={resetToDefaultSort}
                    onSocioRenewed={resetToDefaultSort}
                    sortConfig={sortConfig}
                    setSortConfig={setSortConfig}
                    itemsPerPage={ITEMS_PER_PAGE}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

       <Sheet open={!!editingSocio} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-y-auto min-w-[300px] max-w-[90vw] p-4 sm:p-6">
          {editingSocio && (
            <>
              <SheetHeader>
                <SheetTitle className="truncate pr-8">Modifica: {getFullName(editingSocio)}</SheetTitle>
              </SheetHeader>
              <EditSocioForm
                socio={editingSocio} 
                onClose={() => {
                  setEditingSocio(null);
                  handleTabChange(activeTab); // Refresh current tab view
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
              Stai per stampare la scheda per <span className="font-bold">{socioToPrint ? getFullName(socioToPrint) : ''}</span>. Questo aprirà una nuova finestra di stampa. Vuoi procedere?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSocioToPrint(null)}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={executePrint}>
              Stampa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}
