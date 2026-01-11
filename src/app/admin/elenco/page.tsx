
'use client'

import { Suspense, useState } from "react";
import AuthGuard from "./AuthGuard";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Loader2 } from "lucide-react";
import ElencoClient from "./ElencoClient";

export default function ElencoPage() {
  const [logoutHandler, setLogoutHandler] = useState<() => void>(() => () => {});

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header onLogout={logoutHandler} />
      <main className="flex-grow flex flex-col">
        <Suspense
          fallback={
            <div className="flex-grow flex items-center justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Caricamento...</p>
            </div>
          }
        >
          <AuthGuard>
            {(logout) => {
              // This function will be called by AuthGuard when the user is authenticated
              // It lifts the logout function up to the page state
              // We need to do this in a useEffect to avoid rendering loops
              // eslint-disable-next-line react-hooks/rules-of-hooks
              useState(() => {
                setLogoutHandler(() => logout);
              });
              return <ElencoClient />;
            }}
          </AuthGuard>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
