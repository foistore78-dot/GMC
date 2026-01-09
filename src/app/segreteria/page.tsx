
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { useUser } from '@/firebase';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, QrCode as QrCodeIcon } from 'lucide-react';

const PUBLIC_URL = 'https://studio--studio-9577324505-15044.us-central1.hosted.app';

export default function SegreteriaPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const qrCodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handlePrint = () => {
    const printContent = qrCodeRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) {
      alert('Per favore, consenti i pop-up per questo sito.');
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Stampa QR Code Iscrizioni</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Roboto:wght@400;500;700&display=swap');
            body { 
              font-family: 'Roboto', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }
            .print-container {
              text-align: center;
              padding: 2rem;
              border: 2px dashed #ccc;
              border-radius: 10px;
            }
            h1 {
              font-family: 'Orbitron', sans-serif;
              font-size: 2rem;
              margin-bottom: 0.5rem;
            }
            p {
              font-size: 1rem;
              margin-top: 0;
              margin-bottom: 2rem;
              color: #555;
            }
            @media print {
              body {
                display: block;
                padding-top: 5vh;
              }
              .print-container {
                border: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <h1>Garage Music Club</h1>
            <p>Scansiona per iscriverti!</p>
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <QrCodeIcon className="w-8 h-8 md:w-10 md:h-10 text-primary" />
          <h1 className="font-headline text-3xl md:text-5xl text-primary">
            Segreteria
          </h1>
        </div>

        <div className="bg-background rounded-lg border border-border shadow-lg p-6 md:p-8 flex flex-col items-center gap-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">QR Code per Iscrizioni</h2>
            <p className="text-muted-foreground mt-2">
              Mostra o stampa questo QR code per permettere ai nuovi soci di iscriversi tramite il modulo online.
            </p>
          </div>

          <div ref={qrCodeRef} className="bg-white p-6 rounded-lg">
            <QRCode
              value={PUBLIC_URL}
              size={256}
              viewBox={`0 0 256 256`}
            />
          </div>

          <p className="text-sm text-muted-foreground break-all">{PUBLIC_URL}</p>

          <Button onClick={handlePrint} size="lg">
            <Printer className="mr-2 h-5 w-5" />
            Stampa QR Code
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
