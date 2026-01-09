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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  const initialHideExpired = searchParams.get("hideExpired") !== "false";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "tessera", direction: "ascending" });
  const [hideExpired, setHideExpired] = useState(initialHideExpired);
  
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
  
  const allSociFromDb = useMemo(() => {
    if (!membersData) return [];
    return membersData;
  }, [membersData]);
  
  const filteredMembers = useMemo(() => {
    const searchString = filter.toLowerCase();
    if (!allSociFromDb) return [];
    if (!searchString) return allSociFromDb;

    return allSociFromDb.filter(socio => {
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
    });
  }, [allSociFromDb, filter]);

  const activeSoci = useMemo(() => {
    if (hideExpired) {
      return filteredMembers.filter(s => getStatus(s) !== 'expired');
    }
    return filteredMembers;
  }, [filteredMembers, hideExpired]);
  
  const sortedMembers = useMemo(() => {
    return [...activeSoci].sort((a, b) => {
        const { key, direction } = sortConfig;
        
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
    }).map(s => ({ ...s, membershipStatus: 'active' as const }));
  }, [activeSoci, sortConfig]);

  const sortedRequests = useMemo(() => {
    if (!requestsData) return [];
    const searchString = filter.toLowerCase();

    const filteredRequests = !searchString ? requestsData : requestsData.filter(socio => {
      const fullName = `${socio.firstName || ''} ${socio.lastName || ''}`.toLowerCase();
      const reversedFullName = `${socio.lastName || ''} ${socio.firstName || ''}`.toLowerCase();
      const email = socio.email?.toLowerCase() || '';
      const birthDate = formatDate(socio.birthDate);
       return (
        fullName.includes(searchString) ||
        reversedFullName.includes(searchString) ||
        email.includes(searchString) ||
        birthDate.includes(searchString)
      );
    });


    return [...filteredRequests].sort((a, b) => {
      const { key, direction } = sortConfig;
      let aValue: any;
      let bValue: any;

      if (key === 'name') {
        aValue = `${a.lastName} ${a.firstName}`.toLowerCase();
        bValue = `${b.lastName} ${b.firstName}`.toLowerCase();
      } else if (key === 'tessera') { 
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
    }).map(s => ({ ...s, membershipStatus: 'pending' as const }));
  }, [requestsData, sortConfig, filter]);
  
  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    if (filter) params.set("filter", filter);
    if (!hideExpired) params.set("hideExpired", "false");
    router.replace(`/admin/elenco?${params.toString()}`);
    setCurrentPage(1);
  }, [filter, activeTab, hideExpired, router]);


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
    if (tab === 'active') {
      setSortConfig({ key: 'tessera', direction: 'ascending' });
    } else {
      setSortConfig({ key: 'requestDate', direction: 'descending' });
    }
  };

  const resetToDefaultSort = () => {
    handleTabChange("active");
    setSortConfig({ key: 'tessera', direction: 'ascending' });
  };
  
  const handlePrintCard = (socio: Socio) => {
    setSocioToPrint(socio);
    setShowPrintDialog(true);
  };

  const executePrint = () => {
    if (!socioToPrint) return;

    const printWindow = window.open('', '_blank', 'height=800,width=800');
    if (!printWindow) {
      alert('Please allow pop-ups for this website');
      return;
    }

    const cardHtml = `
      <html>
        <head>
          <title>Stampa Scheda Socio</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Helvetica+Neue:wght@400;700&display=swap');
            @media print {
              body { margin: 0; -webkit-print-color-adjust: exact; color-adjust: exact; }
            }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
          </style>
        </head>
        <body>
          <div id="print-root"></div>
        </body>
      </html>
    `;
    printWindow.document.write(cardHtml);
    printWindow.document.close();

    // Use React's client-side rendering capabilities in the new window
    import('react-dom/client').then(ReactDOM => {
      const root = ReactDOM.createRoot(printWindow.document.getElementById('print-root')!);
      root.render(<SocioCard socio={socioToPrint} />);

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 500); // Timeout helps ensure all content (especially images) is loaded.
    });

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
          {isLoading && sortedMembers.length === 0 && sortedRequests.length === 0 ? (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
          ) : (
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                <TabsList className="self-start">
                   <TabsTrigger value="active" className="text-xs sm:text-sm">
                    Soci Attivi
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="text-xs sm:text-sm">
                    Richieste
                  </TabsTrigger>
                </TabsList>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                  {activeTab === 'active' && (
                    <div className="flex items-center space-x-2 self-start">
                        <Checkbox
                            id="hide-expired"
                            checked={hideExpired}
                            onCheckedChange={(checked) => {
                                setHideExpired(!!checked);
                            }}
                        />
                        <Label htmlFor="hide-expired" className="cursor-pointer whitespace-nowrap text-sm">
                            Nascondi scaduti
                        </Label>
                    </div>
                  )}
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
              </div>
              <TabsContent value="pending" className="rounded-lg bg-yellow-500/5 p-1 sm:p-4">
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
              <TabsContent value="active" className="rounded-lg p-1 sm:p-4">
                <SociTable 
                    soci={sortedMembers}
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
                  resetToDefaultSort();
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
