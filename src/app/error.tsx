'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error('Application error:', error);
  }, [error]);

  const isPermissionError = error.message?.includes('insufficient permissions');

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md border-destructive/20 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-headline">Oops! Qualcosa è andato storto</CardTitle>
          <CardDescription>
            {isPermissionError 
              ? "Non hai i permessi necessari per visualizzare questa risorsa o eseguire l'operazione."
              : "Si è verificato un errore imprevisto durante l'esecuzione dell'applicazione."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-md mx-6 font-mono break-all max-h-32 overflow-auto">
          {error.message || "Errore sconosciuto"}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
          <Button 
            variant="outline" 
            onClick={() => reset()} 
            className="flex-1 gap-2"
          >
            <RefreshCcw className="w-4 h-4" /> Riprova
          </Button>
          <Button asChild className="flex-1 gap-2">
            <Link href="/">
              <Home className="w-4 h-4" /> Torna alla Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
