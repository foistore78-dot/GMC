"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GarageMusicClubLogo } from "./icons/garage-music-club-logo";
import { Button } from "./ui/button";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { Sheet, SheetTrigger, SheetContent } from "./ui/sheet";
import { Menu, Home, Shield, QrCode, LogOut } from "lucide-react";

export function Header() {
  const router = useRouter();
  const { user } = useUser();
  const auth = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
    router.push("/");
    setIsOpen(false);
  };

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Button asChild variant="ghost" className="justify-start text-base w-full hover:bg-primary/10 hover:text-primary" onClick={() => setIsOpen(false)}>
      <Link href={href}>{children}</Link>
    </Button>
  );

  return (
    <header className="sticky top-0 z-20 bg-secondary/80 backdrop-blur-sm text-white p-4 border-b border-border">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 group">
          <GarageMusicClubLogo className="w-10 h-10 text-white group-hover:text-primary transition-colors" />
          <span className="font-headline text-xl font-bold tracking-wider hidden sm:block text-foreground">
            GARAGE MUSIC CLUB
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" className="hover:bg-primary/10 hover:text-primary">
                <Link href="/admin">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost" className="hover:bg-primary/10 hover:text-primary">
                <Link href="/segreteria">Segreteria</Link>
              </Button>
              <Button onClick={handleLogout} variant="ghost" className="hover:bg-destructive/10 hover:text-destructive">
                Logout
              </Button>
            </>
          ) : (
             <Button asChild variant="ghost" className="hover:bg-primary/10 hover:text-primary">
              <Link href="/login">Login Admin</Link>
            </Button>
          )}
        </nav>
        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs bg-secondary">
              <div className="flex flex-col h-full pt-8">
                 <div className="p-4 flex items-center gap-3 border-b border-border">
                    <GarageMusicClubLogo className="w-8 h-8 text-white" />
                    <span className="font-headline text-lg font-bold text-foreground">MENU</span>
                 </div>
                 <div className="flex flex-col gap-2 p-4 flex-grow">
                    <NavLink href="/"><Home className="mr-2 h-4 w-4" /> Home</NavLink>
                    {user ? (
                      <>
                        <NavLink href="/admin"><Shield className="mr-2 h-4 w-4" /> Dashboard</NavLink>
                        <NavLink href="/segreteria"><QrCode className="mr-2 h-4 w-4" /> Segreteria</NavLink>
                      </>
                    ) : (
                      <NavLink href="/login"><Shield className="mr-2 h-4 w-4" /> Login Admin</NavLink>
                    )}
                 </div>
                 {user && (
                    <div className="p-4 border-t border-border">
                      <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-base hover:bg-destructive/10 hover:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" /> Logout
                      </Button>
                    </div>
                 )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
