"use client";

import type { Socio } from "@/lib/soci-data";
import { GarageMusicClubLogo } from "./icons/garage-music-club-logo";
import { formatDate } from "./soci-table";

type SocioCardProps = {
  socio: Socio;
};

const Field = ({ label, value }: { label: string; value: string | undefined | null }) => (
  <div style={{ flex: '1 1 45%', minWidth: '200px' }}>
    <p style={{ fontSize: '8px', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 2px 0', letterSpacing: '0.5px' }}>{label}</p>
    <p style={{ fontWeight: 'bold', fontSize: '11px', margin: 0 }}>{value || <>&nbsp;</>}</p>
  </div>
);

export function SocioCard({ socio }: SocioCardProps) {
  const relevantDateLabel = socio.renewalDate ? "DATA RINNOVO" : "DATA AMMISSIONE";
  const relevantDateValue = socio.renewalDate || socio.joinDate;

  return (
    <div style={{ background: 'white', color: 'black', width: '18cm', minHeight: '26cm', display: 'flex', flexDirection: 'column', fontFamily: "'Helvetica', 'Arial', sans-serif" }}>
      
      {/* Header */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'middle', width: '60px', paddingRight: '10px' }}>
              <GarageMusicClubLogo className="w-16 h-16" />
            </td>
            <td style={{ verticalAlign: 'middle' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0', letterSpacing: '0.05em' }}>GARAGE MUSIC CLUB</h1>
              <p style={{ fontSize: '12px', margin: '0' }}>Associazione Culturale</p>
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
      <div style={{ textAlign: 'center', margin: '15px 0', borderTop: '1px solid black', borderBottom: '1px solid black', padding: '5px 0' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, letterSpacing: '1px' }}>DOMANDA DI AMMISSIONE A SOCIO</h2>
      </div>

      {/* Main Info */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px 10px', marginBottom: '20px' }}>
        <Field label="COGNOME E NOME" value={`${socio.lastName || ''} ${socio.firstName || ''}`} />
        <Field label="DATA DI NASCITA" value={formatDate(socio.birthDate)} />
        <Field label="LUOGO DI NASCITA" value={socio.birthPlace} />
        <Field label="CODICE FISCALE" value={socio.fiscalCode} />
        <Field label="INDIRIZZO DI RESIDENZA" value={`${socio.address || ''}, ${socio.postalCode || ''} ${socio.city || ''} (${socio.province || ''})`} />
        <Field label="TELEFONO" value={socio.phone} />
      </div>

      {/* Consents */}
      <div style={{ marginBottom: '25px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 8px 0', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>DICHIARAZIONI E CONSENSI</h3>
        <p style={{ fontSize: '10px', lineHeight: '1.5', margin: '0 0 10px 0' }}>
          Il/La sottoscritto/a, letta l'informativa sul trattamento dei dati personali, chiede di essere ammesso/a come socio/a all'Associazione Culturale "Garage Music Club", di cui dichiara di aver preso visione dello statuto e dei regolamenti interni e di accettarli integralmente. Si impegna a versare la quota associativa annuale.
        </p>
        <p style={{ fontSize: '10px', lineHeight: '1.5', margin: 0 }}>
          <b>Consenso WhatsApp:</b> Acconsente all'inserimento del proprio numero di telefono nel gruppo WhatsApp dell'associazione per comunicazioni relative alle attività.
          <br />
          <b>Consenso Privacy (Art. 13 GDPR):</b> Dichiara di aver ricevuto, letto e compreso l'informativa sul trattamento dei dati personali e <b>acconsente</b> al trattamento dei propri dati personali per le finalità associative, inclusa la gestione del tesseramento e l'invio di comunicazioni istituzionali. Il consenso è obbligatorio per l'ammissione.
        </p>
      </div>
      
      {/* Signatures */}
      <table style={{ width: '100%', marginTop: 'auto', marginBottom: '25px', fontSize: '11px' }}>
        <tbody>
          <tr>
            <td style={{ width: '50%' }}>Data: _________________________</td>
            <td style={{ width: '50%', textAlign: 'right' }}>Firma del Socio: _________________________</td>
          </tr>
        </tbody>
      </table>

      {/* Association Box */}
      <div style={{ border: '2px solid black', padding: '10px' }}>
        <p style={{ textAlign: 'center', fontSize: '10px', margin: '-18px 0 10px 0' }}>
            <span style={{ background: 'white', padding: '0 5px' }}>- Riservato all'associazione -</span>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px 10px' }}>
            <Field label="ANNO ASSOCIATIVO" value={socio.membershipYear} />
            <Field label="N. TESSERA" value={socio.tessera} />
            <Field label="QUOTA VERSATA" value={socio.membershipFee ? `€ ${socio.membershipFee}`: ''} />
            <Field label={relevantDateLabel} value={formatDate(relevantDateValue)} />
            <Field label="DATA SCADENZA" value={formatDate(socio.expirationDate)} />
        </div>
      </div>
      
      {/* Notes */}
      {socio.notes && (
         <div style={{ marginTop: '20px', paddingTop: '10px', borderTop: '1px dashed #ccc' }}>
            <h4 style={{ fontSize: '10px', fontWeight: 'bold', margin: '0 0 5px 0' }}>NOTE:</h4>
            <p style={{ fontSize: '9px', whiteSpace: 'pre-wrap', margin: 0, color: '#333' }}>
              {socio.notes}
            </p>
         </div>
      )}

    </div>
  );
}
    