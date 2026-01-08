"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SociTable, type SortConfig } from "@/components/soci-table";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Loader2, Users } from "lucide-react";
import type { Socio } from "@/lib/soci-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditSocioForm } from "@/components/edit-socio-form";
import { getFullName } from "@/components/soci-table";
import { Badge } from "@/components/ui/badge";

export default function AdminPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [editingSocio, setEditingSocio] = useState<Socio | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "tessera", direction: "ascending" });

  const membersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, "members") : null),
    [firestore]
  );
  const requestsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, "membership_requests") : null),
    [firestore]
  );

  const { data: membersData, isLoading: isMembersLoading } = useCollection<Socio>(membersQuery);
  const { data: requestsData, isLoading: isRequestsLoading } = useCollection<Socio>(requestsQuery);

  const getTesseraNumber = (tessera: string | undefined) => {
    if (!tessera) return Infinity;
    const parts = tessera.split('-');
    const num = parseInt(parts[parts.length - 1], 10);
    return isNaN(num) ? Infinity : num;
  };
  
  const sortedMembers = useMemo(() => {
    if (!membersData) return [];
    const sorted = [...membersData].sort((a, b) => {
      const { key, direction } = sortConfig;
      let aValue: any;
      let bValue: any;
      
      if (key === 'tessera') {
        aValue = getTesseraNumber(a.tessera);
        bValue = getTesseraNumber(b.tessera);
      } else if (key === 'name') {
        aValue = `${a.lastName} ${a.firstName}`;
        bValue = `${b.lastName} ${b.firstName}`;
      } else {
        aValue = a[key as keyof Socio];
        bValue = b[key as keyof Socio];
      }

      if (aValue < bValue) return direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return direction === 'ascending' ? 1 : -1;
      return 0;
    });
    return sorted.map(s => ({ ...s, membershipStatus: 'active' as const }));
  }, [membersData, sortConfig]);

  const sortedRequests = useMemo(() => {
    if (!requestsData) return [];
    const sorted = [...requestsData].sort((a, b) => {
      const { key, direction } = sortConfig;
      let aValue: any;
      let bValue: any;

      if (key === 'name') {
        aValue = `${a.lastName} ${a.firstName}`;
        bValue = `${b.lastName} ${b.firstName}`;
      } else if (key === 'tessera') {
        // Pending members don't have a card number, fallback to name
        aValue = `${a.lastName} ${a.firstName}`;
        bValue = `${b.lastName} ${b.firstName}`;
      } else {
         aValue = a[key as keyof Socio];
         bValue = b[key as keyof Socio];
      }

      if (aValue < bValue) return direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return direction === 'ascending' ? 1 : -1;
      return 0;
    });
    return sorted.map(s => ({ ...s, membershipStatus: 'pending' as const }));
  }, [requestsData, sortConfig]);


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

  const handleSocioApproved = () => {
    handleTabChange("active");
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
        <div className="flex items-center gap-4 mb-8">
          <Users className="w-10 h-10 text-primary" />
          <h1 className="font-headline text-4xl md:text-5xl text-primary">
            Gestione Soci
          </h1>
        </div>

        <div className="bg-background rounded-lg border border-border shadow-lg p-4">
          {isLoading && sortedMembers.length === 0 && sortedRequests.length === 0 ? (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
          ) : (
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="mb-4">
                <TabsTrigger value="pending">
                  Soci in Sospeso
                  <Badge variant="secondary" className="ml-2">{sortedRequests.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="active">
                  Soci Attivi
                  <Badge variant="secondary" className="ml-2">{sortedMembers.length}</Badge>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="pending">
                <SociTable 
                    soci={sortedRequests}
                    onEdit={handleEditSocio}
                    allMembers={membersData || []}
                    onSocioApproved={handleSocioApproved}
                    sortConfig={sortConfig}
                    setSortConfig={setSortConfig}
                />
              </TabsContent>
              <TabsContent value="active">
                <SociTable 
                    soci={sortedMembers}
                    onEdit={handleEditSocio}
                    allMembers={membersData || []}
                    sortConfig={sortConfig}
                    setSortConfig={setSortConfig}
                />
              </TabsContent>
            </Tabs>
          )}
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
