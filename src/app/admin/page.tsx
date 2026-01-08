"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SociTable, getFullName } from "@/components/soci-table";
import { useUser, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, query, limit, orderBy, startAfter, DocumentData, QueryDocumentSnapshot, getDocs } from "firebase/firestore";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]);
  const [isLastPage, setIsLastPage] = useState(false);
  const [isFetchingPage, setIsFetchingPage] = useState(false);

  const membersCollectionRef = useMemoFirebase(() => (firestore) ? collection(firestore, 'members') : null, [firestore]);
  const requestsCollectionRef = useMemoFirebase(() => (firestore) ? collection(firestore, 'membership_requests') : null, [firestore]);
  
  // Use a separate query for pagination that we can control manually
  const [currentMembersQuery, setCurrentMembersQuery] = useState(() => 
    membersCollectionRef ? query(membersCollectionRef, orderBy("lastName"), limit(PAGE_SIZE)) : null
  );

  // Hook for paginated members
  const { data: membersData, isLoading: isMembersLoading } = useCollection<Socio>(
    useMemoFirebase(() => currentMembersQuery, [currentMembersQuery])
  );

  // Hook for all pending requests (no pagination needed for these)
  const { data: requestsData, isLoading: isRequestsLoading } = useCollection<Socio>(
    useMemoFirebase(() => requestsCollectionRef ? query(requestsCollectionRef, orderBy("lastName")) : null, [requestsCollectionRef])
  );

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [user, isUserLoading, router]);
  
  // Effect to set the initial query when firestore is ready
  useEffect(() => {
    if (membersCollectionRef && !currentMembersQuery) {
        setCurrentMembersQuery(query(membersCollectionRef, orderBy("lastName"), limit(PAGE_SIZE)));
    }
  }, [membersCollectionRef, currentMembersQuery]);

  // Effect to determine if we are on the last page
  useEffect(() => {
    if (membersData) {
      setIsLastPage(membersData.length < PAGE_SIZE);
    }
  }, [membersData]);


  const fetchNextPage = async () => {
    if (isLastPage || !membersData || membersData.length === 0 || !membersCollectionRef) return;
    
    setIsFetchingPage(true);
    const lastVisible = await getDocs(currentMembersQuery!).then(snap => snap.docs[snap.docs.length-1]);
    
    if (lastVisible) {
      const nextPageQuery = query(membersCollectionRef, orderBy("lastName"), startAfter(lastVisible), limit(PAGE_SIZE));
      setCurrentMembersQuery(nextPageQuery);
      setPageCursors(prev => [...prev, lastVisible]);
      setCurrentPage(prev => prev + 1);
    }
    setIsFetchingPage(false);
  };

  const fetchPrevPage = () => {
    if (currentPage > 1 && membersCollectionRef) {
      const prevCursor = pageCursors[currentPage - 2];
      const prevPageQuery = prevCursor
        ? query(membersCollectionRef, orderBy("lastName"), startAfter(prevCursor), limit(PAGE_SIZE))
        : query(membersCollectionRef, orderBy("lastName"), limit(PAGE_SIZE));

      setCurrentMembersQuery(prevPageQuery);
      setPageCursors(prev => prev.slice(0, -1));
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleCloseSheet = () => {
    setEditingSocio(null);
  };
  
  // Combine and sort data for display
  const combinedSoci: Socio[] = useMemo(() => {
    const activeMembers = membersData || [];
    const pendingRequests = requestsData || [];

    // Combine members from the current page with all pending requests
    const combinedList = [...activeMembers, ...pendingRequests];

    // Deduplicate in case a member is also in requests for some reason
    const sociMap = new Map<string, Socio>();
    combinedList.forEach(s => sociMap.set(s.id, s));
    
    return Array.from(sociMap.values()).sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
  }, [membersData, requestsData]);

  const isLoading = isUserLoading || isMembersLoading || isRequestsLoading || isFetchingPage;

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
            <>
              <SociTable 
                  soci={combinedSoci}
                  onEdit={setEditingSocio}
                  onSocioDelete={() => {}} 
              />
              <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchPrevPage}
                  disabled={currentPage === 1 || isLoading}
                >
                  Precedente
                </Button>
                <span className="text-sm text-muted-foreground">Pagina {currentPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchNextPage}
                  disabled={isLastPage || isLoading}
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
