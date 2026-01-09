"use client";

import type { Socio } from "@/lib/soci-data";
import { GarageMusicClubLogo } from "./icons/garage-music-club-logo";
import { formatDate } from "./soci-table";

type SocioCardProps = {
  socio: Socio;
};

const Field = ({ label, value }: { label: string; value?: string | number | null }) => {
  if (!value && value !== 0) return null;
  return (
    <>
      <p className="text-[8px] uppercase tracking-wider text-gray-500 m-0 p-0">{label}</p>
      <p className="font-medium text-[9px] -mt-0.5 m-0 p-0">{value}</p>
    </>
  );
};


export function SocioCard({ socio }: SocioCardProps) {
  const isMinor = socio.guardianFirstName && socio.guardianLastName;
  
  const relevantDateLabel = socio.renewalDate ? "Data Rinnovo" : "Data Richiesta";
  const relevantDateValue = socio.renewalDate ? socio.renewalDate : socio.requestDate;

  return (
    <div className="bg-white text-black p-0 font-sans text-xs">
      <div className="flex items-start justify-between pb-2 border-b-2 border-gray-800">
        <div className="flex items-center gap-2">
          <GarageMusicClubLogo className="w-14 h-14" />
          <div>
            <h1 className="text-base font-bold font-headline tracking-wider">GARAGE MUSIC CLUB</h1>
            <p className="text-[9px]">Associazione Culturale</p>
          </div>
        </div>
        <div className="text-right text-[8px] max-w-[200px]">
          <p>Sede: Via XXIV Udine n. 43, Gradisca d’Isonzo (GO)</p>
          <p>Email: garage.music.club2024@gmail.com</p>
          <p>C.F. 91028120317</p>
        </div>
      </div>

      <div className="mt-2">
        <h2 className="text-center font-headline text-sm font-bold mb-1">DOMANDA DI AMMISSIONE A SOCIO</h2>
        
        <div className="border-t border-b py-1 my-1">
            <p className="text-[8px] uppercase tracking-wider text-gray-500 m-0 p-0">Cognome e Nome / Qualifica</p>
            <p className="font-medium text-base -mt-0.5 m-0 p-0">
              {`${socio.lastName} ${socio.firstName}`}
              {socio.qualifica && socio.qualifica.length > 0 && <span className="font-normal text-xs"> ({socio.qualifica.join(', ')})</span>}
            </p>
             <table className="w-full mt-1 text-[9px]" style={{ borderCollapse: 'collapse' }}>
                <tbody>
                    <tr>
                        <td style={{ width: '50%', padding: '2px 8px 2px 0', verticalAlign: 'top' }}><Field label="Data di Nascita" value={formatDate(socio.birthDate)} /></td>
                        <td style={{ width: '50%', padding: '2px 0 2px 8px', verticalAlign: 'top' }}><Field label="Luogo di Nascita" value={socio.birthPlace} /></td>
                    </tr>
                     <tr>
                        <td style={{ width: '50%', padding: '2px 8px 2px 0', verticalAlign: 'top' }}><Field label="Codice Fiscale" value={socio.fiscalCode} /></td>
                        <td style={{ width: '50%', padding: '2px 0 2px 8px', verticalAlign: 'top' }}><Field label="Indirizzo di Residenza" value={`${socio.address}, ${socio.postalCode} ${socio.city} (${socio.province})`} /></td>
                    </tr>
                    <tr>
                        <td style={{ width: '50%', padding: '2px 8px 2px 0', verticalAlign: 'top' }}><Field label="Email" value={socio.email} /></td>
                        <td style={{ width: '50%', padding: '2px 0 2px 8px', verticalAlign: 'top' }}><Field label="Telefono" value={socio.phone} /></td>
                    </tr>
                </tbody>
            </table>
        </div>

        {isMinor && (
           <div className="mt-1">
             <h3 className="font-headline text-[10px] font-bold">DATI DEL GENITORE O TUTORE (per socio minorenne)</h3>
             <div className="border-t border-b py-1 my-1">
                <table className="w-full text-[9px]" style={{ borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '50%', padding: '2px 8px 2px 0', verticalAlign: 'top' }}><Field label="Cognome e Nome Tutore" value={`${socio.guardianLastName} ${socio.guardianFirstName}`} /></td>
                            <td style={{ width: '50%', padding: '2px 0 2px 8px', verticalAlign: 'top' }}><Field label="Data di Nascita Tutore" value={formatDate(socio.guardianBirthDate)} /></td>
                        </tr>
                    </tbody>
                </table>
             </div>
           </div>
        )}

        <div className="mt-2 text-[8px] text-gray-700 space-y-1">
            <h4 className="font-bold text-[9px] text-black">DICHIARAZIONI E CONSENSI</h4>
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
        
        <div className="mt-3 pt-2 border-t border-gray-300 flex justify-between text-[9px]">
            <p>Data: ____________________</p>
            <div className="w-2/5 text-center">
                <p className="m-0 p-0">Firma del Socio</p>
                <div className="mt-4 border-b border-gray-400"></div>
            </div>
            {isMinor && (
                 <div className="w-2/5 text-center">
                    <p className="m-0 p-0">Firma del Genitore/Tutore</p>
                    <div className="mt-4 border-b border-gray-400"></div>
                </div>
            )}
        </div>
        
        <div className="mt-2 text-center text-[8px] text-gray-500">
             - Riservato all'associazione -
        </div>
         <div className="mt-1 text-xs border p-1 grid grid-cols-3 gap-x-2 gap-y-1">
            <Field label="Anno Associativo" value={socio.membershipYear} />
            <Field label="N. Tessera" value={socio.tessera} />
            <Field label="Quota Versata" value={socio.membershipFee ? `€ ${socio.membershipFee.toFixed(2)}` : '€ 0.00'} />
            <Field label={relevantDateLabel} value={formatDate(relevantDateValue)} />
            <Field label="Data Scadenza" value={formatDate(socio.expirationDate)} />
         </div>

         {socio.notes && (
          <div className="mt-1 text-[8px] border-t pt-1">
              <p className="font-bold uppercase text-gray-600 m-0 p-0">Note:</p>
              <div className="text-gray-700 font-sans text-[8px]">
                {socio.notes.split('\n').map((line, index) => (
                  <p key={index} className="m-0 p-0">{line}</p>
                ))}
              </div>
          </div>
        )}
      </div>
    </div>
  );
}
