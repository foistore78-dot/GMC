"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MembersTable } from "@/components/members-table";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Loader2, Users } from "lucide-react";
import { Member } from "@/lib/members-data";

export default function AdminPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const membersCollection = useMemoFirebase(() => (firestore) ? collection(firestore, 'members') : null, [firestore]);
  const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(membersCollection);

  const membershipRequestsCollection = useMemoFirebase(() => (firestore) ? collection(firestore, 'membership_requests') : null, [firestore]);
  const { data: membershipRequests, isLoading: isLoadingRequests } = useCollection<any>(membershipRequestsCollection);

  const allItems = useMemo(() => {
    const combinedData: { [key: string]: any } = {};
    const requests = membershipRequests || [];
    const activeMembers = members || [];

    // Add requests first
    requests.forEach(item => {
        if (item && item.id) combinedData[item.id] = item;
    });
    // Add members, overwriting any pending requests with the same ID
    activeMembers.forEach(item => {
        if (item && item.id) combinedData[item.id] = item;
    });
    return Object.values(combinedData).sort((a,b) => (a.firstName || '').localeCompare(b.firstName || ''));
  }, [members, membershipRequests]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [user, isUserLoading, router]);

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
          {isLoadingMembers || isLoadingRequests ? (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
          ) : (
            <MembersTable allItems={allItems} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
