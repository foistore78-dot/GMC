"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GarageMusicClubLogo } from "./icons/garage-music-club-logo";
import { Button } from "./ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "./ui/sheet";
import { Menu, Home, List, LogOut, Settings, UserCircle, Loader2, BarChart3, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
    onLogout?: () => void;
}

export function Header({ onLogout }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isAdminPage = pathname.startsWith('/admin');

  const handleAdminClick = () => {
    setIsNavigating(true);
    router.push('/admin/elenco');
  };

  const NavLink = ({ href, children, icon: Icon }: { href: string; children: React.ReactNode, icon?: any }) => (
    <Button asChild variant="ghost" className={cn(
      "justify-start text-base w-full hover:bg-primary/10 hover:text-primary",
      pathname === href && "bg-primary/10 text-primary"
    )} onClick={() => setIsOpen(false)}>
      <Link href={href}>
        {Icon && <Icon className="mr-2 h-4 w-4" />}
        {children}
      </Link>
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
            {!isAdminPage && (
              <Button 
                variant="ghost" 
                className="hover:bg-primary/10 hover:text-primary gap-2"
                onClick={handleAdminClick}
                disabled={isNavigating}
              >
                {isNavigating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserCircle className="w-4 h-4" />
                )}
                {isNavigating ? 'Caricamento...' : 'Area Riservata'}
              </Button>
            )}
            {isAdminPage && (
              <>
                <Button asChild variant="ghost" className={cn("hover:bg-primary/10 hover:text-primary", pathname === '/admin/elenco' && "bg-primary/10 text-primary")}>
                  <Link href="/admin/elenco"><List className="mr-2 h-4 w-4" /> Soci</Link>
                </Button>
                <Button asChild variant="ghost" className={cn("hover:bg-primary/10 hover:text-primary", pathname === '/admin/segreteria' && "bg-primary/10 text-primary")}>
                  <Link href="/admin/segreteria"><Printer className="mr-2 h-4 w-4" /> Segreteria</Link>
                </Button>
                <Button asChild variant="ghost" className={cn("hover:bg-primary/10 hover:text-primary", pathname === '/admin/dashboard' && "bg-primary/10 text-primary")}>
                  <Link href="/admin/dashboard"><BarChart3 className="mr-2 h-4 w-4" /> Dashboard</Link>
                </Button>
                <Button asChild variant="ghost" className={cn("hover:bg-primary/10 hover:text-primary", pathname === '/admin/settings' && "bg-primary/10 text-primary")}>
                  <Link href="/admin/settings"><Settings className="mr-2 h-4 w-4" /> Opzioni</Link>
                </Button>
                {onLogout && (
                  <Button variant="ghost" onClick={onLogout} className="hover:bg-primary/10 hover:text-primary">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                )}
              </>
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
              <SheetTitle className="sr-only">Menu Principale</SheetTitle>
              <div className="flex flex-col h-full pt-8">
                 <div className="p-4 flex items-center gap-3 border-b border-border">
                    <GarageMusicClubLogo className="w-8 h-8 text-white" />
                    <div className="font-headline text-lg font-bold text-foreground">MENU</div>
                 </div>
                 <div className="flex flex-col gap-2 p-4 flex-grow">
                    <NavLink href="/" icon={Home}>Home</NavLink>
                    <Button 
                      variant="ghost" 
                      className="justify-start text-base w-full hover:bg-primary/10 hover:text-primary"
                      onClick={handleAdminClick}
                      disabled={isNavigating}
                    >
                      {isNavigating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <List className="mr-2 h-4 w-4" />
                      )}
                      {isNavigating ? 'Caricamento Area Riservata...' : 'Area Riservata'}
                    </Button>
                    {isAdminPage && (
                      <>
                        <NavLink href="/admin/elenco" icon={List}>Soci</NavLink>
                        <NavLink href="/admin/segreteria" icon={Printer}>Segreteria</NavLink>
                        <NavLink href="/admin/dashboard" icon={BarChart3}>Dashboard</NavLink>
                        <NavLink href="/admin/settings" icon={Settings}>Opzioni</NavLink>
                        {onLogout && (
                          <Button variant="ghost" onClick={() => { onLogout(); setIsOpen(false); }} className="justify-start text-base w-full hover:bg-primary/10 hover:text-primary">
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                          </Button>
                        )}
                      </>
                    )}
                 </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
