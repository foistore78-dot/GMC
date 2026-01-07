"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MembersTable, getFullName } from "@/components/members-table";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Loader2, Users } from "lucide-react";
import type { Member } from "@/lib/members-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EditMemberForm } from "@/components/edit-member-form";

export default function AdminPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

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

  const allMembers = useMemo(() => {
    const combinedData: { [key: string]: Member } = {};

    (membershipRequests || []).forEach(item => {
        if (item && item.id) combinedData[item.id] = { ...item } as Member;
    });

    (members || []).forEach(item => {
        if (item && item.id) combinedData[item.id] = { ...item } as Member;
    });

    return Object.values(combinedData).sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
  }, [members, membershipRequests]);

  const handleMemberUpdate = useCallback((updatedMember: Member) => {
    // This will be handled by the real-time listener, but we can optimistically update the form.
    if (editingMember && editingMember.id === updatedMember.id) {
        setEditingMember(updatedMember);
    }
  }, [editingMember]);

  const handleMemberDelete = useCallback((memberId: string) => {
    // The real-time listener will automatically remove the member from the list.
    // We just need to close the sheet if the deleted member was being edited.
    if (editingMember && editingMember.id === memberId) {
        setEditingMember(null);
    }
  }, [editingMember]);
  

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
                onMemberDelete={handleMemberDelete} // Pass a stable delete handler
            />
          )}
        </div>
      </main>

       <Sheet open={!!editingMember} onOpenChange={(isOpen) => !isOpen && setEditingMember(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl md:w-[50vw] lg:w-[40vw]">
          {editingMember && (
            <>
              <SheetHeader>
                <SheetTitle>Modifica Membro: {getFullName(editingMember)}</SheetTitle>
              </SheetHeader>
              <EditMemberForm 
                key={editingMember.id} // Add a key to force re-mount on member change
                member={editingMember} 
                onClose={() => setEditingMember(null)}
                onMemberUpdate={handleMemberUpdate}
                onMemberDelete={handleMemberDelete}
              />
            </>
          )}
        </SheetContent>
      </Sheet>

      <Footer />
    </div>
  );
}
