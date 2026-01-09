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
  
  const relevantDateLabel = socio.renewalDate ? "Data Rinnovo" : "Data Richiesta";
  const relevantDateValue = socio.renewalDate ? socio.renewalDate : socio.requestDate;

  return (
    <div id="printable-card" className="bg-white text-black p-4 font-sans text-xs">
      <header className="flex items-center justify-between pb-2 border-b-2 border-gray-800">
        <div className="flex items-center gap-3">
          <GarageMusicClubLogo className="w-16 h-16" />
          <div>
            <h1 className="text-lg font-bold font-headline tracking-wider">GARAGE MUSIC CLUB</h1>
            <p className="text-2xs">Associazione Culturale</p>
          </div>
        </div>
        <div className="text-right text-2xs">
          <p>Sede: Via XXIV Udine n. 43, Gradisca d’Isonzo (GO)</p>
          <p>Email: garage.music.club2024@gmail.com</p>
          <p>C.F. 91028120317</p>
        </div>
      </header>

      <main className="mt-2">
        <h2 className="text-center font-headline text-base font-bold mb-2">DOMANDA DI AMMISSIONE A SOCIO</h2>
        
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs border-t border-b py-2 my-2">
            <Field label="Cognome e Nome" value={`${socio.lastName} ${socio.firstName}`} />
            <Field label="Data di Nascita" value={formatDate(socio.birthDate)} />
            <Field label="Luogo di Nascita" value={socio.birthPlace} />
            <Field label="Codice Fiscale" value={socio.fiscalCode} />
            <Field label="Indirizzo di Residenza" value={`${socio.address}, ${socio.postalCode} ${socio.city} (${socio.province})`} />
            <Field label="Email" value={socio.email} />
            <Field label="Telefono" value={socio.phone} />
        </div>

        {isMinor && (
           <div className="mt-2">
             <h3 className="font-headline text-sm font-bold mb-1">DATI DEL GENITORE O TUTORE (per socio minorenne)</h3>
             <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs border-t border-b py-2 my-2">
               <Field label="Cognome e Nome Tutore" value={`${socio.guardianLastName} ${socio.guardianFirstName}`} />
               <Field label="Data di Nascita Tutore" value={formatDate(socio.guardianBirthDate)} />
             </div>
           </div>
        )}

        <div className="mt-2 text-2xs text-gray-700 space-y-1">
            <h4 className="font-bold text-xs text-black mb-1">DICHIARAZIONI E CONSENSI</h4>
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
        
        <div className="mt-4 pt-2 border-t border-gray-300 grid grid-cols-2 gap-6 text-xs">
            <div>
                <p>Data: ____________________</p>
            </div>
             <div className="text-center">
                <p>Firma del Socio</p>
                <div className="mt-4 border-b border-gray-400"></div>
            </div>
            {isMinor && (
                 <div className="col-span-2 text-center -mt-2">
                    <p>Firma del Genitore/Tutore</p>
                    <div className="mt-4 border-b border-gray-400"></div>
                </div>
            )}
        </div>
        
        <div className="mt-4 text-center text-2xs text-gray-500">
             - Riservato all'associazione -
        </div>
         <div className="mt-1 text-xs border p-1 grid grid-cols-3 gap-x-4 gap-y-1">
            <Field label="Anno Associativo" value={socio.membershipYear} />
            <Field label="N. Tessera" value={socio.tessera} />
            <Field label="Quota Versata" value={socio.membershipFee ? `€ ${socio.membershipFee}` : '€ 0'} />
            <Field label={relevantDateLabel} value={formatDate(relevantDateValue)} />
            <Field label="Data Scadenza" value={formatDate(socio.expirationDate)} />
         </div>
      </main>
    </div>
  );
}
