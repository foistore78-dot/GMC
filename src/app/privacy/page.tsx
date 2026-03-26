"use client";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { PRIVACY_TEXT } from "@/lib/privacy-text";
import { Download, FileText } from "lucide-react";
import { saveAs } from "file-saver";

export default function PrivacyPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const content = PRIVACY_TEXT[language] || PRIVACY_TEXT.it;

  const handleClose = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      window.close();
    }
  };

  const downloadTxt = () => {
    let text = `${content.title}\n${content.subtitle}\n\n`;
    content.sections.forEach(section => {
      text += `${section.title}\n${section.content}\n`;
      if (section.list) {
        section.list.forEach((item, i) => {
          text += `${section.listType === 'decimal' ? `${i+1}. ` : '- '}${item}\n`;
        });
      }
      if (section.footer) {
        text += `\n${section.footer}\n`;
      }
      text += `\n`;
    });
    
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `Privacy_GarageMusicClub_${language}.txt`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
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
        <div className="max-w-4xl mx-auto bg-background p-8 md:p-12 rounded-lg border border-border shadow-lg relative print:shadow-none print:border-none print:p-0">
          <Button 
            variant="ghost" 
            className="absolute right-4 top-4 hover:bg-primary/10 text-primary font-bold transition-colors border border-primary/20 print:hidden"
            onClick={handleClose}
          >
            CHIUDI
          </Button>

          <h1 className="font-headline text-3xl md:text-4xl text-primary mb-6">
            {content.title}
          </h1>
          <p className="text-muted-foreground mb-8 italic">
            {content.subtitle}
          </p>

          <div className="space-y-6 text-foreground/90">
            {content.sections.map((section, index) => (
              <section key={index}>
                <h2 className="text-xl font-semibold text-primary mb-3">
                  {section.title}
                </h2>
                <div className="whitespace-pre-wrap">
                  {section.content}
                </div>
                {section.list && (
                  <ul className={section.listType === 'decimal' ? "list-decimal list-inside pl-4 mt-2 space-y-1" : "list-disc list-inside pl-4 mt-2 space-y-1"}>
                    {section.list.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
                {section.footer && (
                  <p className="mt-2">{section.footer}</p>
                )}
              </section>
            ))}
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
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
