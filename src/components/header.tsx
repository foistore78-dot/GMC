"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GarageMusicClubLogo } from "./icons/garage-music-club-logo";
import { Button } from "./ui/button";

export function Header() {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');

  return (
    <header className="absolute top-0 left-0 w-full z-20 bg-transparent text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 group">
          <GarageMusicClubLogo className="w-10 h-10 text-primary group-hover:text-accent transition-colors" />
          <span className="font-headline text-xl font-bold tracking-wider hidden sm:block">
            GARAGE MUSIC CLUB
          </span>
        </Link>
        <nav>
          {isAdminPage ? (
             <Button asChild variant="ghost" className="hover:bg-primary/10 hover:text-primary">
                <Link href="/">Esci</Link>
             </Button>
          ) : (
            <Button asChild variant="ghost" className="hover:bg-primary/10 hover:text-primary">
              <Link href="/login">Login Admin</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
