"use client";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { STATUTO_TEXT, STATUTO_EN, STATUTO_SL } from "@/lib/statuto";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { Download, FileText } from "lucide-react";
import { saveAs } from "file-saver";

export default function StatutoPage() {
  const router = useRouter();
  const { language } = useLanguage();

  const getStatuto = () => {
    switch (language) {
      case 'en': return STATUTO_EN;
      case 'sl': return STATUTO_SL;
      default: return STATUTO_TEXT;
    }
  };

  const handleClose = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      window.close();
    }
  };

  const downloadTxt = () => {
    const title = language === 'en' ? "Association Bylaws" : language === 'sl' ? "Statut društva" : "Statuto dell'Associazione";
    const text = `${title}\n\n${getStatuto()}\n\nAssociazione Culturale “Garage Music Club”`;
    
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `Statuto_GarageMusicClub_${language}.txt`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-secondary text-foreground">
      <Header />
      
      {/* Fixed Close Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 print:hidden">
        <Button 
          onClick={downloadTxt}
          variant="secondary"
          className="shadow-2xl rounded-full w-14 h-14 p-0 bg-background border-primary/20 hover:bg-secondary transition-all"
          title="Scarica TXT"
        >
          <FileText className="w-6 h-6 text-primary" />
        </Button>
        <Button 
          onClick={handleClose}
          className="shadow-2xl px-6 py-6 rounded-full font-bold text-lg border-2 border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          CHIUDI
        </Button>
      </div>

      <main className="flex-grow container mx-auto px-4 py-12 md:py-16 pb-32">
        <div className="max-w-4xl mx-auto bg-background p-8 md:p-12 rounded-lg border border-border shadow-xl relative print:shadow-none print:border-none print:p-0">
          <Button 
            variant="ghost" 
            className="absolute right-4 top-4 hover:bg-primary/10 text-primary font-bold transition-colors border border-primary/20 print:hidden"
            onClick={handleClose}
          >
            CHIUDI
          </Button>

          <h1 className="font-headline text-3xl md:text-5xl text-primary mb-8 text-center uppercase tracking-tight">
            {language === 'en' ? "Association Bylaws" : language === 'sl' ? "Statut društva" : "Statuto dell'Associazione"}
          </h1>
          
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap font-sans text-lg leading-relaxed text-foreground/90 bg-secondary/30 p-6 md:p-10 rounded-md border border-primary/10 shadow-inner italic print:bg-transparent print:border-none print:p-0">
              {getStatuto()}
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-border text-center flex flex-col items-center gap-6 print:hidden">
            <Button 
              onClick={handleClose} 
              className="w-full sm:w-auto px-10 font-bold"
            >
                Chiudi e Torna Indietro
            </Button>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Stampa / PDF
              </Button>
              <Button
                variant="outline"
                onClick={downloadTxt}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Scarica TXT
              </Button>
            </div>
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
