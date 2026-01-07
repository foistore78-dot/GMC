"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MembersTable } from "@/components/members-table";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Loader2, Users } from "lucide-react";
import type { Member } from "@/lib/members-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EditMemberForm } from "@/components/edit-member-form";
import { getFullName } from "@/components/members-table";

export default function AdminPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  
  const membersCollection = useMemoFirebase(() => (firestore) ? collection(firestore, 'members') : null, [firestore]);
  const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(membersCollection);

  const membershipRequestsCollection = useMemoFirebase(() => (firestore) ? collection(firestore, 'membership_requests') : null, [firestore]);
  const { data: membershipRequests, isLoading: isLoadingRequests } = useCollection<any>(membershipRequestsCollection);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const combinedData: { [key: string]: Member } = {};

    (membershipRequests || []).forEach(item => {
      if (item && item.id) combinedData[item.id] = { ...item } as Member;
    });
    
    (members || []).forEach(item => {
      if (item && item.id) combinedData[item.id] = { ...item } as Member;
    });

    const sortedItems = Object.values(combinedData).sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
    setAllMembers(sortedItems);
  }, [members, membershipRequests]);

  const handleMemberUpdate = useCallback((updatedMember: Member) => {
    setAllMembers(prevMembers => {
      const index = prevMembers.findIndex(m => m.id === updatedMember.id);
      if (index !== -1) {
        const newMembers = [...prevMembers];
        newMembers[index] = updatedMember;
        return newMembers;
      }
      return prevMembers; // Should not happen if updating
    });
    // Also update editing member if it's the one being edited
    if (editingMember && editingMember.id === updatedMember.id) {
      setEditingMember(updatedMember);
    }
  }, [editingMember]);

  const handleMemberDelete = useCallback((memberId: string) => {
    setAllMembers(prevMembers => prevMembers.filter(m => m.id !== memberId));
  }, []);
  

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
            Gestione Membri
          </h1>
        </div>

        <div className="bg-background rounded-lg border border-border shadow-lg p-4">
          {(isLoadingMembers || isLoadingRequests) ? (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
          ) : (
            <MembersTable 
                members={allMembers}
                onEdit={setEditingMember}
                onMemberDelete={handleMemberDelete}
            />
          )}
        </div>
      </main>

       <Sheet open={!!editingMember} onOpenChange={(isOpen) => !isOpen && setEditingMember(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {editingMember && (
            <>
              <SheetHeader>
                <SheetTitle>Modifica Membro: {getFullName(editingMember)}</SheetTitle>
              </SheetHeader>
              <EditMemberForm 
                member={editingMember} 
                onClose={() => setEditingMember(null)}
                onMemberUpdate={handleMemberUpdate}
              />
            </>
          )}
        </SheetContent>
      </Sheet>

      <Footer />
    </div>
  );
}