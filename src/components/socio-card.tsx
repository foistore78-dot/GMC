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
      <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', margin: 0, padding: 0 }}>{label}</p>
      <p style={{ fontWeight: 500, fontSize: '9px', marginTop: '-2px', margin: 0, padding: 0 }}>{value}</p>
    </>
  );
};

export function SocioCard({ socio }: SocioCardProps) {
  const isMinor = socio.guardianFirstName && socio.guardianLastName;
  
  const relevantDateLabel = socio.renewalDate ? "Data Rinnovo" : "Data Richiesta";
  const relevantDateValue = socio.renewalDate ? socio.renewalDate : socio.requestDate;

  return (
    <div style={{ background: 'white', color: 'black', padding: '15mm', fontFamily: "'Roboto', sans-serif", fontSize: '10px' }}>
      <table style={{ width: '100%', borderBottom: '2px solid #1f2937', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'middle', width: '70px' }}>
              <GarageMusicClubLogo className="w-14 h-14" />
            </td>
            <td style={{ verticalAlign: 'middle' }}>
              <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '16px', fontWeight: 700, letterSpacing: '0.05em', margin: 0 }}>GARAGE MUSIC CLUB</h1>
              <p style={{ fontSize: '9px', margin: 0 }}>Associazione Culturale</p>
            </td>
            <td style={{ verticalAlign: 'top', textAlign: 'right', fontSize: '8px', maxWidth: '200px' }}>
              <p style={{ margin: 0 }}>Sede: Via XXIV Udine n. 43, Gradisca d’Isonzo (GO)</p>
              <p style={{ margin: 0 }}>Email: garage.music.club2024@gmail.com</p>
              <p style={{ margin: 0 }}>C.F. 91028120317</p>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: '8px' }}>
        <h2 style={{ fontFamily: "'Orbitron', sans-serif", textAlign: 'center', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>DOMANDA DI AMMISSIONE A SOCIO</h2>
        
        <div style={{ borderTop: '1px solid black', borderBottom: '1px solid black', padding: '4px 0' }}>
            <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', margin: 0 }}>Cognome e Nome / Qualifica</p>
            <p style={{ fontWeight: 500, fontSize: '16px', marginTop: '-2px', margin: 0 }}>
              {`${socio.lastName} ${socio.firstName}`}
              {socio.qualifica && socio.qualifica.length > 0 && <span style={{ fontWeight: 400, fontSize: '12px' }}> ({socio.qualifica.join(', ')})</span>}
            </p>
             <table style={{ width: '100%', marginTop: '4px', fontSize: '9px', borderCollapse: 'collapse' }}>
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
           <div style={{ marginTop: '4px' }}>
             <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '10px', fontWeight: 700 }}>DATI DEL GENITORE O TUTORE (per socio minorenne)</h3>
             <div style={{ borderTop: '1px solid black', borderBottom: '1px solid black', padding: '4px 0', margin: '4px 0' }}>
                <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse' }}>
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

        <div style={{ marginTop: '8px', fontSize: '8px', color: '#374151' }}>
            <h4 style={{ fontWeight: 700, fontSize: '9px', color: 'black', margin: '0 0 4px 0' }}>DICHIARAZIONI E CONSENSI</h4>
            <p style={{ margin: '0 0 4px 0' }}>
                Il/La sottoscritto/a, letta l'informativa sul trattamento dei dati personali, chiede di essere ammesso/a come socio/a all'Associazione Culturale "Garage Music Club", di cui dichiara di aver preso visione dello statuto e dei regolamenti interni e di accettarli integralmente. Si impegna a versare la quota associativa annuale.
            </p>
            <p style={{ margin: '0 0 4px 0' }}>
                <span style={{ fontWeight: 700 }}>Consenso WhatsApp:</span> {socio.whatsappConsent ? "Acconsente" : "Non acconsente"} all'inserimento del proprio numero di telefono nel gruppo WhatsApp dell'associazione per comunicazioni relative alle attività.
            </p>
            <p style={{ margin: '0 0 4px 0' }}>
                <span style={{ fontWeight: 700 }}>Consenso Privacy (Art. 13 GDPR):</span> Dichiara di aver ricevuto, letto e compreso l'informativa sul trattamento dei dati personali e <span style={{ fontWeight: 700 }}>acconsente</span> al trattamento dei propri dati personali per le finalità associative, inclusa la gestione del tesseramento e l'invio di comunicazioni istituzionali. Il consenso è obbligatorio per l'ammissione.
            </p>
        </div>
        
        <table style={{ width: '100%', marginTop: '12px', fontSize: '9px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td>Data: ____________________</td>
              <td style={{ width: '40%', textAlign: 'center' }}>
                <p style={{ margin: '0' }}>Firma del Socio</p>
                <div style={{ marginTop: '16px', borderBottom: '1px solid #4b5563' }}></div>
              </td>
              {isMinor && (
                 <td style={{ width: '40%', textAlign: 'center' }}>
                    <p style={{ margin: '0' }}>Firma del Genitore/Tutore</p>
                    <div style={{ marginTop: '16px', borderBottom: '1px solid #4b5563' }}></div>
                </td>
              )}
            </tr>
          </tbody>
        </table>
        
        <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '8px', color: '#6b7280' }}>
             - Riservato all'associazione -
        </div>
         <table style={{ width: '100%', marginTop: '4px', fontSize: '9px', borderCollapse: 'collapse', border: '1px solid black' }}>
           <tbody>
              <tr>
                <td style={{ padding: '2px 4px', borderRight: '1px solid black' }}><Field label="Anno Associativo" value={socio.membershipYear} /></td>
                <td style={{ padding: '2px 4px', borderRight: '1px solid black' }}><Field label="N. Tessera" value={socio.tessera} /></td>
                <td style={{ padding: '2px 4px' }}><Field label="Quota Versata" value={socio.membershipFee ? `€ ${socio.membershipFee.toFixed(2)}` : '€ 0.00'} /></td>
              </tr>
              <tr>
                <td style={{ padding: '2px 4px', borderTop: '1px solid black', borderRight: '1px solid black' }}><Field label={relevantDateLabel} value={formatDate(relevantDateValue)} /></td>
                <td colSpan={2} style={{ padding: '2px 4px', borderTop: '1px solid black' }}><Field label="Data Scadenza" value={formatDate(socio.expirationDate)} /></td>
              </tr>
           </tbody>
         </table>

         {socio.notes && (
          <div style={{ marginTop: '4px', fontSize: '8px', borderTop: '1px solid #d1d5db', paddingTop: '4px' }}>
              <p style={{ fontWeight: 700, textTransform: 'uppercase', color: '#4b5563', margin: 0 }}>Note:</p>
              <div style={{ fontFamily: 'sans-serif', fontSize: '8px', color: '#374151' }}>
                {socio.notes.split('\n').map((line, index) => (
                  <p key={index} style={{ margin: 0 }}>{line}</p>
                ))}
              </div>
          </div>
        )}
      </div>
    </div>
  );
}

    