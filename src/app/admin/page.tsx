"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SociTable } from "@/components/soci-table";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, getDocs, writeBatch as firestoreWriteBatch } from "firebase/firestore";
import { Loader2, Users } from "lucide-react";
import type { Socio } from "@/lib/soci-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EditSocioForm } from "@/components/edit-socio-form";
import { getFullName } from "@/components/soci-table";
import { sociDataSeed } from "@/lib/seed-data";
import { useToast } from "@/hooks/use-toast";


export default function AdminPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [editingSocio, setEditingSocio] = useState<Socio | null>(null);
  const [combinedSoci, setCombinedSoci] = useState<Socio[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

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

  useEffect(() => {
    const seedDataIfNeeded = async () => {
        if (!firestore || dataLoaded) return;

        const requestsCollection = collection(firestore, "membership_requests");
        const membersCollection = collection(firestore, "members");

        const requestsSnapshot = await getDocs(requestsCollection);
        const membersSnapshot = await getDocs(membersCollection);

        if (requestsSnapshot.empty && membersSnapshot.empty) {
            console.log("Database is empty. Seeding test data...");
            try {
                const batch = firestoreWriteBatch(firestore);
                sociDataSeed.forEach(socio => {
                    const docRef = doc(requestsCollection);
                    const { id, ...socioData } = socio;
                    batch.set(docRef, { ...socioData, id: docRef.id });
                });
                await batch.commit();
                toast({
                    title: "Dati di test caricati",
                    description: `Aggiunte ${sociDataSeed.length} richieste di iscrizione di esempio.`,
                });
                // Data will be re-fetched by useCollection hooks, no manual reload needed.
            } catch (error) {
                console.error("Error seeding data:", error);
                toast({
                    title: "Errore nel seeding",
                    description: `Non è stato possibile caricare i dati di test. Dettagli: ${(error as Error).message}`,
                    variant: "destructive",
                });
            }
        }
        setDataLoaded(true); // Mark as checked
    };

    seedDataIfNeeded();
  }, [firestore, dataLoaded, toast]);


  useEffect(() => {
    const sociMap = new Map<string, Socio>();

    (requestsData || []).forEach(s => {
        if (s?.id) sociMap.set(s.id, { ...s, membershipStatus: 'pending' });
    });

    (membersData || []).forEach(s => {
        if (s?.id) sociMap.set(s.id, { ...s, membershipStatus: 'active' });
    });

    const sortedSoci = Array.from(sociMap.values()).sort((a, b) => 
        (a.lastName || '').localeCompare(b.lastName || '')
    );
    
    setCombinedSoci(sortedSoci);
  }, [membersData, requestsData]);
  
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
          {isLoading && combinedSoci.length === 0 ? (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
          ) : (
            <SociTable 
                soci={combinedSoci}
                onEdit={handleEditSocio}
                allMembers={membersData || []}
            />
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
