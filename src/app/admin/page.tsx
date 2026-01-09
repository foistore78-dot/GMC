"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SociTable, type SortConfig, getStatus } from "@/components/soci-table";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { FileDown, FileUp, Loader2, Users, Filter } from "lucide-react";
import type { Socio } from "@/lib/soci-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditSocioForm } from "@/components/edit-socio-form";
import { getFullName } from "@/components/soci-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { exportToExcel } from "@/lib/excel-export";
import { importFromExcel, type ImportResult } from "@/lib/excel-import";
import { useToast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 10;

const getTesseraNumber = (tessera: string | undefined): number => {
  if (!tessera) return Infinity;
  const parts = tessera.split('-');
  if (parts.length < 3) return Infinity;
  const num = parseInt(parts[parts.length - 1], 10);
  return isNaN(num) ? Infinity : num;
};

const getTesseraYear = (socio: Socio) => {
    return socio.membershipYear ? parseInt(socio.membershipYear, 10) : 0;
};

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isImporting, setIsImporting] = useState(false);
  const [editingSocio, setEditingSocio] = useState<Socio | null>(null);
  const [activeTab, setActiveTab] = useState("active");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "tessera", direction: "ascending" });
  const [hideExpired, setHideExpired] = useState(true);
  
  // State for filter and pagination
  const [filter, setFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

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

  const activeSoci = useMemo(() => {
    if (!membersData) return [];
    if (hideExpired) {
        return membersData.filter(s => getStatus(s) !== 'expired');
    }
    return membersData;
  }, [membersData, hideExpired]);
  
  const sortedMembers = useMemo(() => {
    if (!activeSoci) return [];
    
    return [...activeSoci].sort((a, b) => {
        const { key, direction } = sortConfig;
        
        const yearA = getTesseraYear(a);
        const yearB = getTesseraYear(b);

        let aValue: any;
        let bValue: any;
        
        if (key === 'tessera') {
            const numA = getTesseraNumber(a.tessera);
            const numB = getTesseraNumber(b.tessera);
            if (yearA !== yearB) {
                return direction === 'ascending' ? yearA - yearB : yearB - yearA;
            }
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
    return [...requestsData].sort((a, b) => {
      const { key, direction } = sortConfig;
      let aValue: any;
      let bValue: any;

      if (key === 'name') {
        aValue = `${a.lastName} ${a.firstName}`.toLowerCase();
        bValue = `${b.lastName} ${b.firstName}`.toLowerCase();
      } else if (key === 'tessera') { // Cannot sort requests by tessera
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
  }, [requestsData, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, activeTab, hideExpired]);


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
    setFilter('');
    setCurrentPage(1);
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
  
  const handleExport = () => {
    if (!membersData || !requestsData) return;
    exportToExcel(membersData, requestsData);
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
              <Users className="w-10 h-10 text-primary" />
              <h1 className="font-headline text-4xl md:text-5xl text-primary">
                Gestione Soci
              </h1>
           </div>
        </div>

        <div className="bg-background rounded-lg border border-border shadow-lg p-4">
          {isLoading && sortedMembers.length === 0 && sortedRequests.length === 0 ? (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
          ) : (
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
                <TabsList>
                   <TabsTrigger value="active">
                    Soci Attivi
                    <Badge variant="secondary" className="ml-2">{activeSoci.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="pending">
                    Richieste di Iscrizione
                    <Badge variant="secondary" className="ml-2">{sortedRequests.length}</Badge>
                  </TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-4">
                  {activeTab === 'active' && (
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="hide-expired"
                            checked={hideExpired}
                            onCheckedChange={(checked) => {
                                setHideExpired(!!checked);
                            }}
                        />
                        <Label htmlFor="hide-expired" className="cursor-pointer whitespace-nowrap">
                            Nascondi scaduti
                        </Label>
                    </div>
                  )}
                   <div className="relative w-full max-w-sm">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Filtra per nome, data, tessera..."
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                        className="pl-10"
                      />
                    </div>
                </div>
              </div>
              <TabsContent value="pending" className="rounded-lg bg-yellow-500/5 p-4">
                <SociTable 
                    soci={sortedRequests}
                    onEdit={handleEditSocio}
                    allMembers={membersData || []}
                    onSocioApproved={resetToDefaultSort}
                    onSocioRenewed={resetToDefaultSort}
                    sortConfig={sortConfig}
                    setSortConfig={setSortConfig}
                    itemsPerPage={ITEMS_PER_PAGE}
                    filter={filter}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                />
              </TabsContent>
              <TabsContent value="active" className="rounded-lg p-4">
                <SociTable 
                    soci={sortedMembers}
                    onEdit={handleEditSocio}
                    allMembers={membersData || []}
                    onSocioApproved={resetToDefaultSort}
                    onSocioRenewed={resetToDefaultSort}
                    sortConfig={sortConfig}
                    setSortConfig={setSortConfig}
                    itemsPerPage={ITEMS_PER_PAGE}
                    filter={filter}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
        <div className="mt-8 flex justify-start gap-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".xlsx, .xls"
            />
             <Button onClick={handleImportClick} disabled={isLoading || isImporting}>
                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                {isImporting ? "Importazione..." : "Importa da Excel"}
             </Button>
             <Button onClick={handleExport} variant="outline" disabled={isLoading}>
                <FileDown className="mr-2 h-4 w-4" />
                Esporta Elenco Completo
             </Button>
           </div>
      </main>

       <Sheet open={!!editingSocio} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-auto resize-x min-w-[300px] max-w-[90vw]">
          {editingSocio && (
            <>
              <SheetHeader>
                <SheetTitle>Modifica Socio: {getFullName(editingSocio)}</SheetTitle>
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

      <Footer />
    </div>
  );
}
