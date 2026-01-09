"use client";

import type { Socio } from "@/lib/soci-data";
import { GarageMusicClubLogo } from "./icons/garage-music-club-logo";
import { formatDate } from "./soci-table";

type SocioCardProps = {
  socio: Socio;
};

const Field = ({ label, value, large = false }: { label: string; value?: string | number | null; large?: boolean }) => {
  if (!value && value !== 0) return null;
  return (
    <div style={{ marginBottom: '8px' }}>
      <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', margin: 0, padding: 0 }}>{label}</p>
      <p style={{ fontWeight: 500, fontSize: large ? '12px' : '11px', marginTop: '-2px', margin: 0, padding: 0, lineHeight: '1.2' }}>{value}</p>
    </div>
  );
};


export function SocioCard({ socio }: SocioCardProps) {
  const isMinor = socio.guardianFirstName && socio.guardianLastName;
  
  const relevantDateLabel = socio.renewalDate ? "Data Rinnovo" : "Data Ammissione";
  const relevantDateValue = socio.renewalDate || socio.joinDate;

  return (
    <div style={{ background: 'white', color: 'black', padding: '15mm', fontFamily: "'Roboto', sans-serif", fontSize: '10px' }}>
      
      {/* Header */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'middle', width: '70px', paddingRight: '10px' }}>
              <GarageMusicClubLogo className="w-16 h-16" />
            </td>
            <td style={{ verticalAlign: 'middle' }}>
              <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '18px', fontWeight: 700, letterSpacing: '0.05em', margin: 0 }}>GARAGE MUSIC CLUB</h1>
              <p style={{ fontSize: '10px', margin: 0 }}>Associazione Culturale</p>
            </td>
            <td style={{ verticalAlign: 'top', textAlign: 'right', fontSize: '9px', lineHeight: '1.4' }}>
              <p style={{ margin: 0 }}>Sede: Via XXIV Udine n. 43, Gradisca d’Isonzo (GO)</p>
              <p style={{ margin: 0 }}>Email: garage.music.club2024@gmail.com</p>
              <p style={{ margin: 0 }}>C.F. 91028120317</p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Title */}
      <div style={{ textAlign: 'center', margin: '12px 0', borderTop: '1px solid black', borderBottom: '1px solid black', padding: '4px 0' }}>
        <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '14px', fontWeight: 700, margin: 0, textDecoration: 'underline' }}>DOMANDA DI AMMISSIONE A SOCIO</h2>
      </div>

      {/* Main Info */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
        <tbody>
            <tr>
                <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '15px' }}><Field label="Cognome e Nome" value={`${socio.lastName} ${socio.firstName}`} large /></td>
                <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: '15px' }}><Field label="Data di Nascita" value={formatDate(socio.birthDate)} large /></td>
            </tr>
            <tr>
                <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '15px' }}><Field label="Luogo di Nascita" value={socio.birthPlace} /></td>
                <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: '15px' }}><Field label="Codice Fiscale" value={socio.fiscalCode} /></td>
            </tr>
            <tr>
                <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '15px' }}><Field label="Indirizzo di Residenza" value={`${socio.address}, ${socio.postalCode} ${socio.city} (${socio.province})`} /></td>
                <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: '15px' }}><Field label="Telefono" value={socio.phone} /></td>
            </tr>
             {isMinor && (
              <>
                <tr><td colSpan={2} style={{height: '10px'}}></td></tr>
                <tr>
                    <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '15px' }}><Field label="Genitore/Tutore" value={`${socio.guardianLastName} ${socio.guardianFirstName}`} /></td>
                    <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: '15px' }}><Field label="Nato/a il" value={formatDate(socio.guardianBirthDate)} /></td>
                </tr>
              </>
            )}
        </tbody>
      </table>

      {/* Consents */}
      <div style={{ marginTop: '12px', fontSize: '9px', lineHeight: '1.4' }}>
          <h4 style={{ fontWeight: 700, fontSize: '10px', color: 'black', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Dichiarazioni e Consensi</h4>
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
      
      {/* Signature */}
      <table style={{ width: '100%', marginTop: '20px', fontSize: '10px', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{width: '50%'}}>Data: ____________________</td>
            <td style={{ width: '50%', textAlign: 'center', borderTop: '1px solid black', paddingTop: '4px' }}>
              Firma del Socio {isMinor ? ' (e del Genitore/Tutore)' : ''}
            </td>
          </tr>
        </tbody>
      </table>
      
      {/* Association Box */}
      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px', color: '#6b7280' }}>
           - Riservato all'associazione -
      </div>
       <table style={{ width: '100%', marginTop: '4px', border: '1px solid black', borderCollapse: 'collapse' }}>
         <tbody>
            <tr style={{ borderBottom: '1px solid black' }}>
              <td style={{ width: '33.3%', padding: '4px 8px', borderRight: '1px solid black' }}><Field label="Anno Associativo" value={socio.membershipYear} /></td>
              <td style={{ width: '33.3%', padding: '4px 8px', borderRight: '1px solid black' }}><Field label="N. Tessera" value={socio.tessera} /></td>
              <td style={{ width: '33.3%', padding: '4px 8px' }}><Field label="Quota Versata" value={socio.membershipFee ? `€ ${socio.membershipFee.toFixed(2)}` : ''} /></td>
            </tr>
            <tr>
              <td style={{ width: '33.3%', padding: '4px 8px', borderRight: '1px solid black' }}><Field label={relevantDateLabel} value={formatDate(relevantDateValue)} /></td>
              <td colSpan={2} style={{ padding: '4px 8px' }}><Field label="Data Scadenza" value={formatDate(socio.expirationDate)} /></td>
            </tr>
         </tbody>
       </table>
    </div>
  );
}
