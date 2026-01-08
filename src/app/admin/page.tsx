"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SociTable } from "@/components/soci-table";
import { useUser, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Loader2, Users } from "lucide-react";
import type { Socio } from "@/lib/soci-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EditSocioForm } from "@/components/edit-socio-form";
import { getFullName } from "@/components/soci-table";

export default function AdminPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [editingSocio, setEditingSocio] = useState<Socio | null>(null);

  // Define references to the collections
  const membersCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, "members") : null),
    [firestore]
  );
  const requestsCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, "membership_requests") : null),
    [firestore]
  );

  // Define queries for the collections
  const membersQuery = useMemoFirebase(
    () => (membersCollectionRef ? query(membersCollectionRef, orderBy("lastName")) : null),
    [membersCollectionRef]
  );
  const requestsQuery = useMemoFirebase(
    () => (requestsCollectionRef ? query(requestsCollectionRef, orderBy("lastName")) : null),
    [requestsCollectionRef]
  );

  // Use the useCollection hook to fetch data in real-time
  const { data: membersData, isLoading: isMembersLoading } = useCollection<Socio>(membersQuery);
  const { data: requestsData, isLoading: isRequestsLoading } = useCollection<Socio>(requestsQuery);


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [user, isUserLoading, router]);

  const handleCloseSheet = () => {
    setEditingSocio(null);
  };
  
  const combinedSoci = useMemo(() => {
    const activeMembers = membersData || [];
    const pendingRequests = requestsData || [];

    // Combine and deduplicate
    const sociMap = new Map<string, Socio>();
    [...activeMembers, ...pendingRequests].forEach(s => {
        if(s.id) { // Ensure socio has an id
            sociMap.set(s.id, s);
        }
    });
    
    // Sort the combined list
    return Array.from(sociMap.values()).sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
  }, [membersData, requestsData]);

  const isLoading = isUserLoading || isMembersLoading || isRequestsLoading;

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
          {isLoading && !editingSocio ? (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
          ) : (
            <SociTable 
                soci={combinedSoci}
                onEdit={setEditingSocio}
                onSocioDelete={() => {}} 
            />
          )}
        </div>
      </main>

       <Sheet open={!!editingSocio} onOpenChange={(isOpen) => {
           if (!isOpen) {
             handleCloseSheet();
           }
       }}>
        <SheetContent className="w-[50vw] sm:max-w-none overflow-auto resize-x min-w-[300px] max-w-[90vw]">
          {editingSocio && (
            <>
              <SheetHeader>
                <SheetTitle>Modifica Socio: {getFullName(editingSocio)}</SheetTitle>
              </SheetHeader>
              <EditSocioForm
                key={editingSocio.id}
                socio={editingSocio} 
                onClose={handleCloseSheet}
              />
            </>
          )}
        </SheetContent>
      </Sheet>

      <Footer />
    </div>
  );
}
