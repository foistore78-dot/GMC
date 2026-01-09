"use client";

import type { Socio } from "@/lib/soci-data";
import { GarageMusicClubLogo } from "./icons/garage-music-club-logo";
import { formatDate } from "./soci-table";

type SocioCardProps = {
  socio: Socio;
};

// This is a simple, robust component for displaying data.
// It is used inside the details dialog in the soci table.
// It does not have any complex print-specific logic.
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
                <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '15px' }}>
                    <p style={{ fontSize: '9px', textTransform: 'uppercase', color: '#6b7280', margin: 0}}>Cognome e Nome</p>
                    <p style={{ fontWeight: 500, fontSize: '12px', margin: 0}}>{`${socio.lastName} ${socio.firstName}`}</p>
                </td>
                <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: '15px' }}>
                    <p style={{ fontSize: '9px', textTransform: 'uppercase', color: '#6b7280', margin: 0}}>Data di Nascita</p>
                    <p style={{ fontWeight: 500, fontSize: '12px', margin: 0}}>{formatDate(socio.birthDate)}</p>
                </td>
            </tr>
            {/* ... other fields ... */}
        </tbody>
      </table>
    </div>
  );
}
