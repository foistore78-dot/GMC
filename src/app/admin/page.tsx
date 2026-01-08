"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SociTable, getFullName } from "@/components/soci-table";
import { useUser, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, limit, orderBy, getDocs, startAfter, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]);
  const [isLastPage, setIsLastPage] = useState(false);


  const membersCollection = useMemoFirebase(() => (firestore) ? collection(firestore, 'members') : null, [firestore]);
  const membershipRequestsCollection = useMemoFirebase(() => (firestore) ? collection(firestore, 'membership_requests') : null, [firestore]);

  const fetchSoci = async (page: number) => {
    if (!firestore || !membersCollection || !membershipRequestsCollection) return;
    setIsLoading(true);

    const cursor = pageCursors[page - 1];

    const membersQuery = cursor
      ? query(membersCollection, orderBy("lastName"), startAfter(cursor), limit(PAGE_SIZE))
      : query(membersCollection, orderBy("lastName"), limit(PAGE_SIZE));

    const membersSnapshot = await getDocs(membersQuery);
    const membersData = membersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Socio));

    if (membersSnapshot.docs.length > 0) {
      const newLastVisible = membersSnapshot.docs[membersSnapshot.docs.length - 1];
      if (page >= pageCursors.length) {
        setPageCursors(prev => [...prev, newLastVisible]);
      }
      setLastVisible(newLastVisible);
    }
    
    setIsLastPage(membersSnapshot.docs.length < PAGE_SIZE);

    const requestsQuery = query(membershipRequestsCollection, orderBy("lastName"));
    const requestsSnapshot = await getDocs(requestsQuery);
    const requestsData = requestsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Socio));

    const finalSociList = [...membersData];
    const memberIds = new Set(membersData.map(m => m.id));
    requestsData.forEach(req => {
      if (!memberIds.has(req.id)) {
          finalSociList.push(req);
      }
    });

    // We only show members from the current page + all pending requests
    const combinedList = [...membersData, ...requestsData.filter(req => getStatus(req) !== 'active')];

    // Deduplicate in case a member is also in requests for some reason
    const sociMap = new Map<string, Socio>();
    combinedList.forEach(s => sociMap.set(s.id, s));
    
    const sortedList = Array.from(sociMap.values()).sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

    setSoci(sortedList);
    setIsLoading(false);
  };
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    }
    if (firestore && user) {
      fetchSoci(1);
    }
  }, [user, isUserLoading, router, firestore]);

  const handleNextPage = () => {
    if (!isLastPage) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchSoci(nextPage);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      fetchSoci(prevPage);
    }
  };
  
  const handleCloseSheet = () => {
    setEditingSocio(null);
    fetchSoci(currentPage);
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

  const getStatus = (socio: any): 'active' | 'pending' | 'rejected' => {
    if (socio.membershipStatus === 'active') return 'active';
    return socio.status || 'pending';
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
                  onSocioDelete={() => fetchSoci(1)} 
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
