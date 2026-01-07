"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GarageMusicClubLogo } from "./icons/garage-music-club-logo";
import { Button } from "./ui/button";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";

export function Header() {
  const router = useRouter();
  const { user } = useUser();
  const auth = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-20 bg-secondary/80 backdrop-blur-sm text-white p-4 border-b border-border">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 group">
          <GarageMusicClubLogo className="w-10 h-10 text-primary group-hover:text-accent transition-colors" />
          <span className="font-headline text-xl font-bold tracking-wider hidden sm:block text-foreground">
            GARAGE MUSIC CLUB
          </span>
        </Link>
        <nav>
          {user ? (
            <Button onClick={handleLogout} variant="ghost" className="hover:bg-primary/10 hover:text-primary">
              Logout
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
