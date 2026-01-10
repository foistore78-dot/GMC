import { Suspense } from "react";
import ElencoClient from "./ElencoClient";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Loader2 } from "lucide-react";

// This is a Server Component by default
export default function ElencoPage() {
  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header />
      <main className="flex-grow flex flex-col">
        {/* Suspense Boundary is crucial for streaming the client component */}
        <Suspense
          fallback={
            <div className="flex-grow flex items-center justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
          }
        >
          <ElencoClient />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
