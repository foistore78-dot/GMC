import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { AdminUserInitializer } from "@/components/admin-user-initializer";

export const metadata: Metadata = {
  title: "Manager del Garage Music Club",
  description: "Gestisci i membri del Garage Music Club",
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
        <FirebaseClientProvider>
          <AdminUserInitializer />
          {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
