
import { Suspense } from 'react';
import ElencoClient from './ElencoClient';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Loader2 } from 'lucide-react';

const LoadingFallback = () => (
  <div className="flex flex-col min-h-screen bg-secondary">
    <Header />
    <main className="flex-grow flex items-center justify-center">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
    </main>
    <Footer />
  </div>
);

export default function ElencoSociPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ElencoClient />
    </Suspense>
  );
}
