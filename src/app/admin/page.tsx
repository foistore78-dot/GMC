import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MembersTable } from "@/components/members-table";
import { membersData } from "@/lib/members-data";
import { Users } from "lucide-react";

export default async function AdminPage() {
  // In a real application, you would fetch this data from a database.
  const members = membersData;

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
            <Users className="w-10 h-10 text-primary" />
            <h1 className="font-headline text-4xl md:text-5xl text-primary">
                Member Management
            </h1>
        </div>
        
        <div className="bg-background rounded-lg border border-border shadow-lg p-4">
          <MembersTable initialMembers={members} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
