import Link from "next/link";
import { GarageMusicClubLogo } from "./icons/garage-music-club-logo";

export function Footer() {
  return (
    <footer className="bg-secondary border-t border-border py-8">
      <div className="container mx-auto px-4 text-center text-muted-foreground">
        <div className="flex justify-center items-center gap-2 mb-4">
            <GarageMusicClubLogo className="w-8 h-8" />
            <p className="font-headline text-lg">Garage Music Club</p>
        </div>
        <div className="text-sm space-y-1">
          <p>Associazione Culturale “Garage Music Club”</p>
          <p>Sede: Via XXIV Udine n. 43, Gradisca d’Isonzo (GO)</p>
          <p>Email: garage.music.club2024@gmail.com</p>
          <p>Tel: +39 389 7995206</p>
          <p>C.F. 91050330314</p>
        </div>
        <div className="mt-4 text-sm">
            <Link href="/privacy" className="hover:text-primary transition-colors">
                Informativa sulla Privacy
            </Link>
        </div>
        <p className="text-sm mt-4">
          &copy; {new Date().getFullYear()} Garage Music Club. Tutti i diritti riservati.
        </p>
      </div>
    </footer>
  );
}
