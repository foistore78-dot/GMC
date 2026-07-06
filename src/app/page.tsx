"use client";

import Image from "next/image";
import { Guitar, Mic, Speaker, Loader2 } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MembershipForm } from "@/components/membership-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LanguageSelector } from "@/components/language-selector";
import { useLanguage } from "@/components/language-provider";
import { Suspense, useState, useEffect } from "react";
import { useFirestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Home() {
  const heroImage = PlaceHolderImages.find((img) => img.id === "hero-concert");
  const { t } = useLanguage();
  const firestore = useFirestore();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isCheckingMaintenance, setIsCheckingMaintenance] = useState(true);

  useEffect(() => {
    if (!firestore) return;
    const checkMaintenance = async () => {
      try {
        const docRef = doc(firestore, "settings", "general");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data && data.maintenanceMode === true) {
            setIsMaintenance(true);
          }
        }
      } catch (e) {
        console.error("Error checking maintenance mode:", e);
      } finally {
        setIsCheckingMaintenance(false);
      }
    };
    checkMaintenance();
  }, [firestore]);

  const features = [
    {
      icon: <Guitar className="w-10 h-10 text-primary" />,
      title: t('features.jamSessions.title'),
      description: t('features.jamSessions.description'),
    },
    {
      icon: <Mic className="w-10 h-10 text-primary" />,
      title: t('features.liveGigs.title'),
      description: t('features.liveGigs.description'),
    },
    {
      icon: <Speaker className="w-10 h-10 text-primary" />,
      title: t('features.proGear.title'),
      description: t('features.proGear.description'),
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center text-center text-white">
          {heroImage && (
            <Image
              src={heroImage.imageUrl}
              alt={heroImage.description}
              fill
              className="object-cover"
              data-ai-hint={heroImage.imageHint}
              priority
            />
          )}
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 px-4 flex flex-col items-center">
            <h1 className="font-headline text-5xl md:text-7xl lg:text-9xl mb-4 tracking-tighter uppercase relative" style={{ textShadow: '0 0 20px hsla(var(--primary), 0.5), 0 0 40px hsla(var(--primary), 0.3)' }}>
              Garage <span className="text-primary italic">Music</span> Club
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mb-8 font-light">
              {t('hero.subtitle')}
            </p>
            <Button asChild size="lg" className="font-black text-xl px-12 py-8 rounded-full shadow-[0_0_30px_rgba(var(--primary),0.3)] hover:scale-105 transition-all">
              <Link href="#apply">{t('hero.cta')}</Link>
            </Button>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-secondary">
          <div className="container mx-auto px-4">
            <h2 className="font-headline text-4xl md:text-5xl text-center mb-12 text-primary">
              {t('features.title')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="bg-background/50 border-primary/20 hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-2">
                  <CardHeader className="items-center">
                    <div className="p-4 bg-secondary rounded-full mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle className="font-headline text-2xl text-primary">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-muted-foreground">
                    <p>{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="apply" className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="flex justify-center mb-8">
              <LanguageSelector />
            </div>
            <h2 className="font-headline text-4xl md:text-5xl text-center mb-4 text-primary">
              {t('join.title')}
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              {t('join.subtitle')}
            </p>
            <div className="max-w-3xl mx-auto relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <Card className="relative bg-black/40 backdrop-blur-2xl border-white/10 shadow-2xl rounded-3xl overflow-hidden">
                <CardContent className="p-6 md:p-8">
                  {isCheckingMaintenance ? (
                    <div className="flex items-center justify-center p-12">
                      <Loader2 className="animate-spin h-8 w-8 text-primary" />
                    </div>
                  ) : isMaintenance ? (
                    <div className="text-center py-8 px-4 space-y-4">
                      <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4 animate-bounce">
                        <Speaker className="w-8 h-8 text-amber-500" />
                      </div>
                      <h3 className="font-headline text-3xl text-amber-500 uppercase tracking-wide">
                        {t('join.maintenanceTitle')}
                      </h3>
                      <p className="text-sm md:text-base text-foreground/90 leading-relaxed max-w-lg mx-auto">
                        {t('join.maintenanceSubtitle')}
                      </p>
                      <div className="text-xs text-muted-foreground pt-4 border-t border-white/5">
                        Garage Music Club — Staff di Direzione
                      </div>
                    </div>
                  ) : (
                    <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
                      <MembershipForm />
                    </Suspense>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}