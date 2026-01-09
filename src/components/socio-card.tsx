"use client";

import type { Socio } from "@/lib/soci-data";
import { GarageMusicClubLogo } from "./icons/garage-music-club-logo";
import { formatDate } from "./soci-table";

type SocioCardProps = {
  socio: Socio;
};

const Field = ({ label, value }: { label: string; value?: string | number | null }) => {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  );
};


export function SocioCard({ socio }: SocioCardProps) {
  const isMinor = socio.guardianFirstName && socio.guardianLastName;

  return (
    <div id="printable-card" className="bg-white text-black p-6 font-sans">
      <header className="flex items-center justify-between pb-4 border-b-2 border-gray-800">
        <div className="flex items-center gap-4">
          <GarageMusicClubLogo className="w-20 h-20" />
          <div>
            <h1 className="text-xl font-bold font-headline tracking-wider">GARAGE MUSIC CLUB</h1>
            <p className="text-xs">Associazione Culturale</p>
          </div>
        </div>
        <div className="text-right text-xs">
          <p>Sede: Via XXIV Udine n. 43, Gradisca d’Isonzo (GO)</p>
          <p>Email: garage.music.club2024@gmail.com</p>
          <p>C.F. 91028120317</p>
        </div>
      </header>

      <main className="mt-4">
        <h2 className="text-center font-headline text-lg font-bold mb-3">DOMANDA DI AMMISSIONE A SOCIO</h2>
        
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm border-t border-b py-3 my-3">
            <Field label="Cognome e Nome" value={`${socio.lastName} ${socio.firstName}`} />
            <Field label="Data di Nascita" value={formatDate(socio.birthDate)} />
            <Field label="Luogo di Nascita" value={socio.birthPlace} />
            <Field label="Codice Fiscale" value={socio.fiscalCode} />
            <Field label="Indirizzo di Residenza" value={`${socio.address}, ${socio.postalCode} ${socio.city} (${socio.province})`} />
            <Field label="Email" value={socio.email} />
            <Field label="Telefono" value={socio.phone} />
        </div>

        {isMinor && (
           <div className="mt-4">
             <h3 className="font-headline text-md font-bold mb-2">DATI DEL GENITORE O TUTORE (per socio minorenne)</h3>
             <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm border-t border-b py-3 my-3">
               <Field label="Cognome e Nome Tutore" value={`${socio.guardianLastName} ${socio.guardianFirstName}`} />
               <Field label="Data di Nascita Tutore" value={formatDate(socio.guardianBirthDate)} />
             </div>
           </div>
        )}

        <div className="mt-4 text-xs text-gray-700 space-y-1">
            <h4 className="font-bold text-sm text-black mb-2">DICHIARAZIONI E CONSENSI</h4>
            <p>
                Il/La sottoscritto/a, letta l'informativa sul trattamento dei dati personali, chiede di essere ammesso/a come socio/a all'Associazione Culturale "Garage Music Club", di cui dichiara di aver preso visione dello statuto e dei regolamenti interni e di accettarli integralmente. Si impegna a versare la quota associativa annuale.
            </p>
            <p>
                <span className="font-bold">Consenso WhatsApp:</span> {socio.whatsappConsent ? "Acconsente" : "Non acconsente"} all'inserimento del proprio numero di telefono nel gruppo WhatsApp dell'associazione per comunicazioni relative alle attività.
            </p>
            <p>
                <span className="font-bold">Consenso Privacy (Art. 13 GDPR):</span> Dichiara di aver ricevuto, letto e compreso l'informativa sul trattamento dei dati personali e <span className="font-bold">acconsente</span> al trattamento dei propri dati personali per le finalità associative, inclusa la gestione del tesseramento e l'invio di comunicazioni istituzionali. Il consenso è obbligatorio per l'ammissione.
            </p>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-300 grid grid-cols-2 gap-8 text-sm">
            <div>
                <p>Data: ____________________</p>
            </div>
             <div className="text-center">
                <p>Firma del Socio</p>
                <div className="mt-6 border-b border-gray-400"></div>
            </div>
            {isMinor && (
                 <div className="col-span-2 text-center mt-2">
                    <p>Firma del Genitore/Tutore</p>
                    <div className="mt-6 border-b border-gray-400"></div>
                </div>
            )}
        </div>
        
        <div className="mt-6 text-center text-xs text-gray-500">
             - Riservato all'associazione -
        </div>
         <div className="mt-2 text-sm border p-2 grid grid-cols-3 gap-4">
            <Field label="Anno Associativo" value={socio.membershipYear} />
            <Field label="N. Tessera" value={socio.tessera} />
            <Field label="Quota Versata" value={socio.membershipFee ? `€ ${socio.membershipFee}` : '€ 0'} />
            <Field label="Data Ammissione" value={formatDate(socio.joinDate)} />
            <Field label="Data Scadenza" value={formatDate(socio.expirationDate)} />
         </div>
      </main>
    </div>
  );
}
