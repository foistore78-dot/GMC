"use client";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { STATUTO_TEXT } from "@/lib/statuto";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function StatutoPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-secondary text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto bg-background p-8 md:p-12 rounded-lg border border-border shadow-xl relative">
          <Button 
            variant="ghost" 
            className="absolute right-4 top-4 hover:bg-primary/10 text-primary font-bold transition-colors border border-primary/20"
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                window.close();
              }
            }}
          >
            CHIUDI
          </Button>

          <h1 className="font-headline text-3xl md:text-5xl text-primary mb-8 text-center uppercase tracking-tight">
            Statuto dell'Associazione
          </h1>
          
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap font-sans text-lg leading-relaxed text-foreground/90 bg-secondary/30 p-6 md:p-10 rounded-md border border-primary/10 shadow-inner italic">
              {STATUTO_TEXT}
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-border text-center flex flex-col items-center gap-6">
            <Button 
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                } else {
                  window.close();
                }
              }} 
              className="w-full sm:w-auto px-10 font-bold"
            >
                Chiudi e Torna Indietro
            </Button>
            <p className="text-muted-foreground">
              Associazione Culturale “Garage Music Club”
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
