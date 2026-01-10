import { Suspense } from 'react';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { Loader2 } from 'lucide-react';
import LoginClient from './LoginClient';

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4">
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
          }
        >
          <LoginClient />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
