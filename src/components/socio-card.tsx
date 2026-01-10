"use client";

import type { Socio } from "@/lib/soci-data";
import { GarageMusicClubLogo } from "./icons/garage-music-club-logo";
import { formatDate } from "./soci-table";

type SocioCardProps = {
  socio: Socio;
};

const isMinorCheck = (birthDate: string | undefined | Date): boolean => {
  if (!birthDate) return false;
  const date = new Date(birthDate);
  if (isNaN(date.getTime())) return false;
  
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const m = today.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
      age--;
  }
  return age < 18;
};


const Field = ({ label, value }: { label: string; value: string | undefined | null }) => (
  <div style={{ flex: '1 1 45%', minWidth: '200px' }}>
    <p style={{ fontSize: '9px', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 2px 0', letterSpacing: '0.5px' }}>{label}</p>
    <p style={{ fontWeight: 'bold', fontSize: '12px', margin: 0, borderBottom: '1px solid #eee', paddingBottom: '2px' }}>{value || <>&nbsp;</>}</p>
  </div>
);

const Checkbox = ({ checked }: { checked: boolean }) => (
    <span style={{
        display: 'inline-block',
        width: '12px',
        height: '12px',
        border: '1px solid black',
        marginRight: '8px',
        verticalAlign: 'middle',
        textAlign: 'center',
        lineHeight: '12px',
        fontWeight: 'bold',
        color: 'black',
        backgroundColor: checked ? '#e0e0e0' : 'white',
    }}>
        {checked ? '✔' : ''}
    </span>
);


export function SocioCard({ socio }: SocioCardProps) {
  const isMinor = isMinorCheck(socio.birthDate);
  const relevantDateLabel = socio.renewalDate ? "DATA RINNOVO" : "DATA AMMISSIONE";
  const relevantDateValue = socio.renewalDate || socio.joinDate;

  return (
    <div style={{ background: 'white', color: 'black', width: '100%', maxWidth: '18cm', margin: '0 auto', fontFamily: "'Roboto', sans-serif", padding: '1cm' }}>
      
      {/* Header -- Completely rewritten with a table for stability */}
      <table style={{ width: '100%', borderSpacing: 0, marginBottom: '15px' }}>
        <tbody>
          <tr>
            {/* Colonna 1: Logo */}
            <td style={{ width: '60px', verticalAlign: 'middle', paddingRight: '15px' }}>
              <div style={{ width: '60px', height: '60px' }}>
                <GarageMusicClubLogo className="w-full h-full" style={{ objectFit: 'contain' }} />
              </div>
            </td>
            
            {/* Colonna 2: Titolo */}
            <td style={{ verticalAlign: 'middle', textAlign: 'left' }}>
              <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '22px', fontWeight: 'bold', margin: '0', letterSpacing: '0.05em' }}>GARAGE MUSIC CLUB</h1>
              <p style={{ fontSize: '13px', margin: '0' }}>Associazione Culturale</p>
            </td>

            {/* Colonna 3: Dati Sede */}
            <td style={{ verticalAlign: 'middle', textAlign: 'right', fontSize: '10px', lineHeight: '1.4', paddingLeft: '15px' }}>
              <p style={{ margin: 0 }}>Sede: Via XXIV Udine n. 43, Gradisca d’Isonzo (GO)</p>
              <p style={{ margin: 0 }}>Email: garage.music.club2024@gmail.com</p>
              <p style={{ margin: 0 }}>Tel: +39 389 7995206</p>
              <p style={{ margin: 0 }}>C.F. 91050330314</p>
            </td>
          </tr>
        </tbody>
      </table>


      {/* Title */}
      <div style={{ textAlign: 'center', margin: '15px 0', borderTop: '2px solid black', borderBottom: '2px solid black', padding: '8px 0' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, letterSpacing: '1px' }}>DOMANDA DI AMMISSIONE A SOCIO</h2>
      </div>

      {/* Main Info */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px 15px', marginBottom: '20px' }}>
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
       <div style={{ marginBottom: '15px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 10px 0', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>DICHIARAZIONI E CONSENSI</h3>
        <div style={{ fontSize: '10px', lineHeight: '1.5' }}>
            <div style={{ margin: '0 0 8px 0' }}>
                Il/La sottoscritto/a, letta l'informativa sul trattamento dei dati personali, chiede di essere ammesso/a come socio/a all'Associazione Culturale "Garage Music Club", di cui dichiara di aver preso visione dello statuto e dei regolamenti interni e di accettarli integralmente. Si impegna a versare la quota associativa annuale.
            </div>
             <div style={{ marginBottom: '8px' }}>
                <Checkbox checked={!!socio.whatsappConsent} />
                <b>Consenso WhatsApp:</b> Acconsente all'inserimento del proprio numero di telefono nel gruppo WhatsApp dell'associazione per comunicazioni relative alle attività.
            </div>
            <div>
                <Checkbox checked={socio.privacyConsent} />
                <b>Consenso Privacy (Art. 13 GDPR):</b> Dichiara di aver ricevuto, letto e compreso l'informativa sul trattamento dei dati personali e acconsente al trattamento dei propri dati personali per le finalità associative, inclusa la gestione del tesseramento e l'invio di comunicazioni istituzionali. Il consenso è obbligatorio per l'ammissione.
            </div>
        </div>
      </div>
      
      {/* Signatures */}
      <table style={{ width: '100%', marginTop: '20px', marginBottom: '20px', fontSize: '12px' }}>
        <tbody>
          <tr>
            <td style={{ width: '50%' }}>Data: _________________________</td>
            <td style={{ width: '50%', textAlign: 'right' }}>Firma del Socio: _________________________</td>
          </tr>
        </tbody>
      </table>

      {/* Guardian Section (if minor) */}
      {isMinor && (
        <div style={{ marginTop: '15px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 10px 0', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '5px 0', textAlign: 'center' }}>
            PARTE RISERVATA AL GENITORE O A CHI NE FA LE VECI
          </h3>
          <div style={{ fontSize: '10px', lineHeight: '1.5', margin: '0 0 10px 0', textAlign: 'justify' }}>
            Il/La sottoscritto/a <b>{`${socio.guardianLastName || ''} ${socio.guardianFirstName || ''}`}</b>, nato/a a ________________ il <b>{formatDate(socio.guardianBirthDate)}</b>, in qualità di genitore/tutore legale del minore sopra indicato, dichiara di approvare la presente domanda di ammissione e di accettare lo statuto e i regolamenti dell'associazione.
          </div>
          <table style={{ width: '100%', fontSize: '12px', marginTop: '10px' }}>
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
      <div style={{ border: '2px solid black', padding: '15px', marginTop: isMinor ? '10px' : 'auto' }}>
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
         <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px dashed #ccc' }}>
            <h4 style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 5px 0' }}>NOTE:</h4>
            <div style={{ fontSize: '10px', whiteSpace: 'pre-wrap', color: '#333' }}>
              {socio.notes.split('\n').map((line, index) => (
                <div key={index} style={{ margin: 0 }}>{line}</div>
              ))}
            </div>
         </div>
      )}

    </div>
  );
}
