"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SociTable, getFullName } from "@/components/soci-table";
import { useUser, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, limit, orderBy, getDocs, startAfter, endBefore, limitToLast, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
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
  
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);


  const membersCollection = useMemoFirebase(() => (firestore) ? collection(firestore, 'members') : null, [firestore]);
  const membershipRequestsCollection = useMemoFirebase(() => (firestore) ? collection(firestore, 'membership_requests') : null, [firestore]);

  const fetchSoci = async (direction: 'next' | 'prev' | 'initial' = 'initial') => {
    if (!firestore || !membersCollection) return;
    setIsLoading(true);

    let allResults: Socio[] = [];
    
    // We will primarily paginate on the 'members' collection as it's likely the largest.
    // Requests will be loaded alongside for status management but won't affect pagination logic.
    let membersQuery;

    if (direction === 'next' && lastVisible) {
        membersQuery = query(membersCollection, orderBy("lastName"), startAfter(lastVisible), limit(PAGE_SIZE));
    } else if (direction === 'prev' && firstVisible) {
        membersQuery = query(membersCollection, orderBy("lastName", "desc"), startAfter(firstVisible), limit(PAGE_SIZE));
    } else {
        setCurrentPage(1);
        membersQuery = query(membersCollection, orderBy("lastName"), limit(PAGE_SIZE));
    }

    const membersSnapshot = await getDocs(membersQuery);
    const membersData = membersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Socio));

    if (direction === 'prev') {
        membersData.reverse(); // Reverse to maintain ascending order
    }

    setLastVisible(membersSnapshot.docs[membersSnapshot.docs.length - 1] || null);
    setFirstVisible(membersSnapshot.docs[0] || null);

    // Check if it's the last page
    setIsLastPage(membersSnapshot.docs.length < PAGE_SIZE);

    // Fetch all pending requests - assuming this list is not excessively large.
    // For very large applications, requests might also need pagination.
    const requestsQuery = query(membershipRequestsCollection, orderBy("lastName"));
    const requestsSnapshot = await getDocs(requestsQuery);
    const requestsData = requestsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Socio));

    // Combine and deduplicate, prioritizing member data over request data if IDs overlap
    const combinedData: { [key: string]: Socio } = {};
    requestsData.forEach(item => {
        if (item && item.id) combinedData[item.id] = { ...item };
    });
    membersData.forEach(item => {
        if (item && item.id) combinedData[item.id] = { ...item };
    });

    const finalSociList = [...membersData];
    const memberIds = new Set(membersData.map(m => m.id));
    requestsData.forEach(req => {
        if (!memberIds.has(req.id)) {
            finalSociList.push(req);
        }
    });

    setSoci(finalSociList.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '')));
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

  const handleNextPage = () => {
    if (!isLastPage) {
      setCurrentPage(p => p + 1);
      fetchSoci('next');
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(p => p - 1);
      // Firestore's `endBefore` and `limitToLast` are more complex for this simple pagination.
      // A full re-fetch from the start up to the previous page's start is one way,
      // but for this implementation we will reset and go to page 1.
      // For a more robust solution, storing cursors for each page is needed.
      // Let's reset to the first page for simplicity in this iteration.
      fetchSoci('initial');
    }
  };
  
  const handleCloseSheet = () => {
    setEditingSocio(null);
    // Using reload as a robust way to ensure all state is fresh.
    window.location.reload();
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
            <>
              <SociTable 
                  soci={soci}
                  onEdit={setEditingSocio}
                  onSocioDelete={() => fetchSoci('initial')} // Refetch current view
              />
              <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  Precedente
                </Button>
                <span className="text-sm text-muted-foreground">Pagina {currentPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={isLastPage}
                >
                  Successivo
                </Button>
              </div>
            </>
          )}
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

    