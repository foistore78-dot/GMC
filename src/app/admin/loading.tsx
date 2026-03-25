import { Loader2 } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function AdminLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header />
      <main className="flex-grow flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 bg-primary/20 rounded-full animate-ping" />
            </div>
          </div>
          <p className="font-headline tracking-widest text-xl text-primary uppercase animate-pulse">Caricamento Area Riservata</p>
          <p className="text-muted-foreground -mt-4 text-sm uppercase tracking-wide">Pazienta un istante...</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
