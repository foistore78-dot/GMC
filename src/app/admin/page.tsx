"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SociTable } from "@/components/soci-table";
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

  const membersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, "members"), orderBy("lastName")) : null),
    [firestore]
  );
  const requestsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, "membership_requests"), orderBy("lastName")) : null),
    [firestore]
  );

  const { data: membersData, isLoading: isMembersLoading } = useCollection<Socio>(membersQuery);
  const { data: requestsData, isLoading: isRequestsLoading } = useCollection<Socio>(requestsQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [user, isUserLoading, router]);

  const activeSoci = useMemo(() => {
    if (!membersData) return [];
    return membersData
      .map(s => ({ ...s, membershipStatus: 'active' as const }))
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
  }, [membersData]);

  const pendingSoci = useMemo(() => {
    if (!requestsData) return [];
     return requestsData
      .map(s => ({ ...s, membershipStatus: 'pending' as const }))
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
  }, [requestsData]);

  const isLoading = isUserLoading || isMembersLoading || isRequestsLoading;

  const handleEditSocio = (socio: Socio) => {
    setEditingSocio(socio);
  };
  
  const handleSheetOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setEditingSocio(null);
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
        <div className="flex items-center gap-4 mb-8">
          <Users className="w-10 h-10 text-primary" />
          <h1 className="font-headline text-4xl md:text-5xl text-primary">
            Gestione Soci
          </h1>
        </div>

        <div className="bg-background rounded-lg border border-border shadow-lg p-4">
          {isLoading && activeSoci.length === 0 && pendingSoci.length === 0 ? (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
          ) : (
            <Tabs defaultValue="pending">
              <TabsList className="mb-4">
                <TabsTrigger value="pending">
                  Soci in Sospeso
                  <Badge variant="secondary" className="ml-2">{pendingSoci.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="active">
                  Soci Attivi
                  <Badge variant="secondary" className="ml-2">{activeSoci.length}</Badge>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="pending">
                <SociTable 
                    soci={pendingSoci}
                    onEdit={handleEditSocio}
                    allMembers={membersData || []}
                />
              </TabsContent>
              <TabsContent value="active">
                <SociTable 
                    soci={activeSoci}
                    onEdit={handleEditSocio}
                    allMembers={membersData || []}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

       <Sheet open={!!editingSocio} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-[50vw] sm:max-w-none overflow-auto resize-x min-w-[300px] max-w-[90vw]">
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
