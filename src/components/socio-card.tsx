
"use client";

import type { Socio } from "@/lib/soci-data";
import { GarageMusicClubLogo } from "./icons/garage-music-club-logo";
import { formatDate } from "./soci-table";
import { differenceInYears } from 'date-fns';


type SocioCardProps = {
  socio: Socio;
};

const isMinorCheck = (birthDate: string | undefined): boolean => {
  if (!birthDate) return false;
  const date = new Date(birthDate);
  if (isNaN(date.getTime())) return false;
  return differenceInYears(new Date(), date) < 18;
};


const Field = ({ label, value }: { label: string; value: string | undefined | null }) => (
  <div style={{ flex: '1 1 45%', minWidth: '200px' }}>
    <p style={{ fontSize: '9px', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 2px 0', letterSpacing: '0.5px' }}>{label}</p>
    <p style={{ fontWeight: 'bold', fontSize: '12px', margin: 0, borderBottom: '1px solid #eee', paddingBottom: '2px' }}>{value || <>&nbsp;</>}</p>
  </div>
);

export function SocioCard({ socio }: SocioCardProps) {
  const isMinor = isMinorCheck(socio.birthDate);
  const relevantDateLabel = socio.renewalDate ? "DATA RINNOVO" : "DATA AMMISSIONE";
  const relevantDateValue = socio.renewalDate || socio.joinDate;

  return (
    <div style={{ background: 'white', color: 'black', width: '100%', maxWidth: '18cm', margin: '0 auto', fontFamily: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif", padding: '1cm' }}>
      
      {/* Header */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'middle', width: '60px', paddingRight: '15px' }}>
              <GarageMusicClubLogo className="w-16 h-16" />
            </td>
            <td style={{ verticalAlign: 'middle' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0', letterSpacing: '0.05em' }}>GARAGE MUSIC CLUB</h1>
              <p style={{ fontSize: '13px', margin: '0' }}>Associazione Culturale</p>
            </td>
            <td style={{ verticalAlign: 'top', textAlign: 'right', fontSize: '10px', lineHeight: '1.4' }}>
              <p style={{ margin: 0 }}>Sede: Via XXIV Udine n. 43, Gradisca d’Isonzo (GO)</p>
              <p style={{ margin: 0 }}>Email: garage.music.club2024@gmail.com</p>
              <p style={{ margin: 0 }}>C.F. 91028120317</p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Title */}
      <div style={{ textAlign: 'center', margin: '20px 0', borderTop: '2px solid black', borderBottom: '2px solid black', padding: '8px 0' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, letterSpacing: '1px' }}>DOMANDA DI AMMISSIONE A SOCIO</h2>
      </div>

      {/* Main Info */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 15px', marginBottom: '25px' }}>
        <Field label="COGNOME E NOME" value={`${socio.lastName || ''} ${socio.firstName || ''}`} />
        <Field label="DATA DI NASCITA" value={formatDate(socio.birthDate)} />
        <Field label="LUOGO DI NASCITA" value={socio.birthPlace} />
        <Field label="CODICE FISCALE" value={socio.fiscalCode} />
        <Field label="INDIRIZZO DI RESIDENZA" value={`${socio.address || ''}, ${socio.postalCode || ''} ${socio.city || ''} (${socio.province || ''})`} />
        <Field label="TELEFONO" value={socio.phone} />
        <Field label="EMAIL" value={socio.email} />
        <Field label="QUALIFICA" value={socio.qualifica?.join(', ')} />
      </div>

      {/* Consents */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 10px 0', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>DICHIARAZIONI E CONSENSI</h3>
        <p style={{ fontSize: '10px', lineHeight: '1.5', margin: '0 0 10px 0', textAlign: 'justify' }}>
          Il/La sottoscritto/a, letta l'informativa sul trattamento dei dati personali, chiede di essere ammesso/a come socio/a all'Associazione Culturale "Garage Music Club", di cui dichiara di aver preso visione dello statuto e dei regolamenti interni e di accettarli integralmente. Si impegna a versare la quota associativa annuale. Dichiara inoltre di acconsentire all'inserimento del proprio numero di telefono nel gruppo WhatsApp dell'associazione per comunicazioni relative alle attività. Dichiara di aver ricevuto, letto e compreso l'informativa sul trattamento dei dati personali e <b>acconsente</b> al trattamento dei propri dati personali per le finalità associative.
        </p>
      </div>
      
      {/* Signatures */}
      <table style={{ width: '100%', marginTop: '25px', marginBottom: '25px', fontSize: '12px' }}>
        <tbody>
          <tr>
            <td style={{ width: '50%' }}>Data: _________________________</td>
            <td style={{ width: '50%', textAlign: 'right' }}>Firma del Socio: _________________________</td>
          </tr>
        </tbody>
      </table>

      {/* Guardian Section (if minor) */}
      {isMinor && (
        <div style={{ marginTop: '20px', marginBottom: '25px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 10px 0', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '5px 0', textAlign: 'center' }}>
            PARTE RISERVATA AL GENITORE O A CHI NE FA LE VECI
          </h3>
          <p style={{ fontSize: '10px', lineHeight: '1.5', margin: '0 0 15px 0', textAlign: 'justify' }}>
            Il/La sottoscritto/a <b>{`${socio.guardianLastName || ''} ${socio.guardianFirstName || ''}`}</b>, in qualità di genitore/tutore legale del minore sopra indicato, dichiara di approvare la presente domanda di ammissione e di accettare lo statuto e i regolamenti dell'associazione.
          </p>
          <table style={{ width: '100%', fontSize: '12px' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%' }}>Data: _________________________</td>
                <td style={{ width: '50%', textAlign: 'right' }}>Firma del Genitore/Tutore: _________________________</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Association Box */}
      <div style={{ border: '2px solid black', padding: '15px', marginTop: 'auto' }}>
        <p style={{ textAlign: 'center', fontSize: '10px', margin: '-23px 0 15px 0' }}>
            <span style={{ background: 'white', padding: '0 8px', fontWeight: 'bold' }}>- Riservato all'associazione -</span>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px 10px' }}>
            <Field label="ANNO ASSOCIATIVO" value={socio.membershipYear} />
            <Field label="N. TESSERA" value={socio.tessera} />
            <Field label="QUOTA VERSATA" value={socio.membershipFee != null ? `€ ${socio.membershipFee.toFixed(2)}` : ''} />
            <Field label={relevantDateLabel} value={formatDate(relevantDateValue)} />
            <Field label="DATA SCADENZA" value={formatDate(socio.expirationDate)} />
        </div>
      </div>
      
      {/* Notes */}
      {socio.notes && (
         <div style={{ marginTop: '20px', paddingTop: '10px', borderTop: '1px dashed #ccc' }}>
            <h4 style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 5px 0' }}>NOTE:</h4>
            <div style={{ fontSize: '10px', whiteSpace: 'pre-wrap', color: '#333' }}>
              {socio.notes.split('\n').map((line, index) => (
                <p key={index} style={{ margin: 0 }}>{line}</p>
              ))}
            </div>
         </div>
      )}

    </div>
  );
}

    