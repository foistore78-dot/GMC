"use client";

import Image from "next/image";
import { Guitar, Mic, Speaker } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MembershipForm } from "@/components/membership-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LanguageSelector } from "@/components/language-selector";
import { useLanguage } from "@/components/language-provider";

export default function Home() {
  const heroImage = PlaceHolderImages.find((img) => img.id === "hero-concert");
  const { t } = useLanguage();

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
            <h1 className="font-headline text-5xl md:text-7xl lg:text-8xl mb-4 tracking-wider uppercase" style={{ textShadow: '0 0 10px hsl(var(--primary)), 0 0 20px hsl(var(--primary))' }}>
              Garage Music Club
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mb-8 font-light">
              {t('hero.subtitle')}
            </p>
            <Button asChild size="lg" className="font-bold text-lg px-10 py-6">
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
            <div className="max-w-2xl mx-auto">
              <Card className="bg-secondary border-primary/20">
                <CardContent className="p-6 md:p-8">
                  <MembershipForm />
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
