import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";

export const metadata: Metadata = {
  title: "Garage Music Club | Portale Soci",
  description: "Area gestione e iscrizioni per l'Associazione Culturale Garage Music Club di Gradisca d'Isonzo. Unisciti alla nostra comunità di musicisti.",
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: "https://i.imgur.com/Pp0tSQj.png",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Roboto:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased min-h-screen bg-background flex flex-col">
        <LanguageProvider>
          <FirebaseClientProvider>
            {children}
          </FirebaseClientProvider>
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
