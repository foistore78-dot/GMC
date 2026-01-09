
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Socio } from '@/lib/soci-data';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, QrCode as QrCodeIcon, FileUp, FileDown, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";

import { exportToExcel } from "@/lib/excel-export";
import { importFromExcel, type ImportResult } from "@/lib/excel-import";


const PUBLIC_URL = 'https://studio--studio-9577324505-15044.us-central1.hosted.app';

export default function SegreteriaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  const membersQueryRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'members') : null),
    [firestore]
  );
  const requestsQueryRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'membership_requests') : null),
    [firestore]
  );

  const { data: membersData, isLoading: isMembersLoading } = useCollection<Socio>(membersQueryRef);
  const { data: requestsData, isLoading: isRequestsLoading } = useCollection<Socio>(requestsQueryRef);

  const isDataLoading = isMembersLoading || isRequestsLoading;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handlePrintQr = () => {
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
            @page { 
              size: A4;
              margin: 2cm;
            }
            body { 
              font-family: 'Roboto', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100%;
              margin: 0;
            }
            .print-container {
              text-align: center;
              padding: 2rem;
              border: 2px dashed #ccc;
              border-radius: 10px;
              width: 100%;
              max-width: 18cm;
            }
            h1 {
              font-family: 'Orbitron', sans-serif;
              font-size: 2.5rem;
              margin-bottom: 0.5rem;
            }
            p {
              font-size: 1.2rem;
              margin-top: 0;
              margin-bottom: 2.5rem;
              color: #555;
            }
            @media print {
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
  
    // Use a timeout to ensure content is fully loaded before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };
  
  const handleExport = () => {
    const members = (membersData as Socio[]) || [];
    const requests = (requestsData as Socio[]) || [];
    exportToExcel(members, requests);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && firestore) {
      setIsImporting(true);
      try {
        const result: ImportResult = await importFromExcel(file, firestore);
        const { createdCount, updatedTessere, errorCount } = result;
        
        let description = `Creati ${createdCount} nuovi soci. Aggiornati ${updatedTessere.length} soci esistenti.`;
        if (errorCount > 0) {
          description += ` ${errorCount} righe con errori sono state saltate.`;
        }

        toast({
          title: "Importazione Completata",
          description: description,
          duration: 8000,
        });
      } catch (error) {
        console.error("Import error:", error);
        toast({
          title: "Errore durante l'importazione",
          description: (error as Error).message || "Si è verificato un problema.",
          variant: "destructive",
        });
      } finally {
        setIsImporting(false);
        if(fileInputRef.current) fileInputRef.current.value = "";
      }
    }
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
            Area Segreteria
          </h1>
        </div>

        <Tabs defaultValue="dati" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
                <TabsTrigger value="dati">Gestione Dati</TabsTrigger>
                <TabsTrigger value="modulistica">Modulistica</TabsTrigger>
                <TabsTrigger value="link">Link Utili</TabsTrigger>
            </TabsList>
            <TabsContent value="dati">
                <Card>
                    <CardHeader>
                        <CardTitle>Importa / Esporta Dati</CardTitle>
                        <CardDescription>
                            Gestisci l'elenco dei soci importando o esportando un file Excel.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <h3 className="font-semibold mb-2">Esporta Elenco Soci</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Scarica l'elenco completo di tutti i soci (attivi e richieste) in un singolo file Excel.
                            </p>
                             <Button onClick={handleExport} variant="outline" disabled={isDataLoading}>
                                <FileDown className="mr-2 h-4 w-4" />
                                <span className="sm:hidden">Esporta</span>
                                <span className="hidden sm:inline">Esporta Elenco Completo</span>
                            </Button>
                        </div>
                         <div>
                            <h3 className="font-semibold mb-2">Importa Elenco Soci</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Aggiungi o aggiorna soci caricando un file Excel (.xlsx, .xls). Assicurati che il file abbia le colonne corrette.
                            </p>
                             <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".xlsx, .xls"
                            />
                            <Button onClick={handleImportClick} disabled={isDataLoading || isImporting}>
                                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                                <span className="sm:hidden">Importa</span>
                                <span className="hidden sm:inline">{isImporting ? "Importazione..." : "Importa da Excel"}</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="modulistica">
                <Card>
                    <CardHeader>
                        <CardTitle>Modulo di Iscrizione PDF</CardTitle>
                        <CardDescription>
                            Scarica il modulo di iscrizione in formato PDF compilabile digitalmente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <h3 className="font-semibold mb-2">Modulo PDF Compilabile</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Clicca qui per scaricare il modulo di domanda di ammissione a socio. Può essere compilato al computer e poi stampato.
                            </p>
                             <Button asChild>
                                <a href="https://www.fantastificio.it/wp-content/uploads/2023/11/Modulo-Iscrizione-Associazione-Fantastificio-APS-compilabile.pdf" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center">
                                    <FileText className="mr-2 h-4 w-4" />
                                    Scarica Modulo PDF
                                </a>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="link">
                 <Card>
                    <CardHeader>
                        <CardTitle>QR Code per Iscrizioni</CardTitle>
                        <CardDescription>
                            Mostra o stampa questo QR code per permettere ai nuovi soci di iscriversi tramite il modulo online.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-8">
                         <div ref={qrCodeRef} className="bg-white p-6 rounded-lg">
                            <QRCode
                            value={PUBLIC_URL}
                            size={256}
                            viewBox={`0 0 256 256`}
                            />
                        </div>

                        <p className="text-sm text-muted-foreground break-all">{PUBLIC_URL}</p>

                        <Button onClick={handlePrintQr} size="lg">
                            <Printer className="mr-2 h-5 w-5" />
                            Stampa QR Code
                        </Button>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
