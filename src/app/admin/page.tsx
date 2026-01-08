"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SociTable, getFullName } from "@/components/soci-table";
import { useUser, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, limit, orderBy, getDocs, startAfter, endBefore, limitToLast } from "firebase/firestore";
import { Loader2, Users } from "lucide-react";
import type { Socio } from "@/lib/soci-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EditSocioForm } from "@/components/edit-socio-form";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 10;

export default function AdminPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [editingSocio, setEditingSocio] = useState<Socio | null>(null);
  const [soci, setSoci] = useState<Socio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [firstVisible, setFirstVisible] = useState<any>(null);
  const [isFirstPage, setIsFirstPage] = useState(true);
  const [isLastPage, setIsLastPage] = useState(false);
  
  const membersCollection = useMemoFirebase(() => (firestore) ? collection(firestore, 'members') : null, [firestore]);
  const membershipRequestsCollection = useMemoFirebase(() => (firestore) ? collection(firestore, 'membership_requests') : null, [firestore]);

  const fetchSoci = async (direction: 'next' | 'prev' | 'initial' = 'initial') => {
    if (!firestore) return;
    setIsLoading(true);

    const collectionsToQuery = [membersCollection, membershipRequestsCollection];
    let allResults: Socio[] = [];
    let queryConstraints;

    // We can't reliably paginate across multiple collections.
    // For now we will just load all requests and active members.
    // A more scalable solution would involve a single collection or a backend process.

    for (const coll of collectionsToQuery) {
        if (!coll) continue;
        const q = query(coll, orderBy("firstName"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Socio));
        allResults.push(...data);
    }
    
    // Deduplicate and sort
    const combinedData: { [key: string]: Socio } = {};
    allResults.forEach(item => {
        if (item && item.id) combinedData[item.id] = { ...item } as Socio;
    });

    const sortedData = Object.values(combinedData).sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));

    setSoci(sortedData);
    setIsLoading(false);
  };


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    }
    if (firestore) {
      fetchSoci();
    }
  }, [user, isUserLoading, router, firestore]);
  
  const handleCloseSheet = () => {
    setEditingSocio(null);
    fetchSoci(); // Refetch data
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
          {isLoading ? (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
          ) : (
            <SociTable 
                soci={soci}
                onEdit={setEditingSocio}
                onSocioDelete={fetchSoci}
            />
          )}
          {/* A more robust pagination for multiple collections is needed in the future */}
        </div>
      </main>

       <Sheet open={!!editingSocio} onOpenChange={(isOpen) => {
           if (!isOpen) {
             handleCloseSheet();
           }
       }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl md:w-[50vw] lg:w-[40vw]">
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
