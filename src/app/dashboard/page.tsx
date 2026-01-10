import { Suspense } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Loader2 } from "lucide-react";
import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header />
      <main className="flex-grow flex flex-col">
        <Suspense
          fallback={
            <div className="flex-grow flex items-center justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
          }
        >
          <DashboardClient />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
