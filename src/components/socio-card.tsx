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
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
  return age < 18;
};

type FieldProps = { label: string; value?: string | null };

const Field = ({ label, value }: FieldProps) => {
  const display =
    value && value.toString().trim().length > 0 ? value.toString() : "\u00A0";

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          fontSize: "9px",
          textTransform: "uppercase",
          color: "#6b7280",
          margin: "0 0 2px 0",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: "12px",
          borderBottom: "1px solid #eee",
          paddingBottom: "2px",
          lineHeight: "1.2",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {display}
      </div>
    </div>
  );
};

const Checkbox = ({ checked }: { checked: boolean }) => (
  <span
    style={{
      display: "inline-block",
      width: "12px",
      height: "12px",
      border: "1px solid #000",
      marginRight: "8px",
      verticalAlign: "middle",
      textAlign: "center",
      lineHeight: "12px",
      fontSize: "10px",
      fontWeight: 700,
      color: "black",
      backgroundColor: checked ? "#e0e0e0" : "white",
    }}
  >
    {checked ? "✓" : ""}
  </span>
);

const cleanOneLine = (s: string) => s.replace(/\s+/g, " ").trim();

export function SocioCard({ socio }: SocioCardProps) {
  const isMinor = isMinorCheck(socio.birthDate);
  const relevantDateLabel = socio.renewalDate ? "DATA RINNOVO" : "DATA AMMISSIONE";
  const relevantDateValue = socio.renewalDate || socio.joinDate;

  const fullName = cleanOneLine(`${socio.lastName || ""} ${socio.firstName || ""}`);
  const address = cleanOneLine(
    `${socio.address || ""}, ${socio.postalCode || ""} ${socio.city || ""} (${socio.province || ""})`
  );

  return (
    <div
      style={{
        background: "white",
        color: "black",
        width: "100%",
        maxWidth: "18cm",
        margin: "0 auto",
        fontFamily: "Roboto, Arial, Helvetica, sans-serif",
        padding: "1cm",
      }}
    >
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          html,
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          * {
            box-sizing: border-box;
          }
          table,
          div.no-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          tr,
          td,
          th {
            page-break-inside: avoid;
          }
          h1,
          h2,
          h3 {
            page-break-after: avoid;
          }
        }
        div,
        td,
        p,
        h1,
        h2,
        h3 {
          overflow-wrap: anywhere;
          word-break: break-word;
        }
      `}</style>
      <table className="no-break" style={{ width: '100%', borderSpacing: 0, marginBottom: '10px' }}>
        <tbody>
            <tr>
                <td style={{ width: '60px', paddingRight: '10px', verticalAlign: 'middle', flex: '0 0 60px' }}>
                    <div style={{ width: '60px', height: '60px' }}>
                        <GarageMusicClubLogo />
                    </div>
                </td>
                <td style={{ textAlign: 'left', verticalAlign: 'middle', flex: 1, padding: '0 10px' }}>
                     <h1
                        style={{
                        fontFamily: "Orbitron, Arial Black, Arial, sans-serif",
                        fontSize: "22px",
                        fontWeight: "bold",
                        margin: 0,
                        letterSpacing: "0.05em",
                        }}
                    >
                        GARAGE MUSIC CLUB
                    </h1>
                    <p style={{ fontSize: "13px", margin: 0 }}>Associazione Culturale</p>
                </td>
                <td style={{ verticalAlign: 'middle', textAlign: 'right', fontSize: '10px', lineHeight: '1.4', width: '180px' }}>
                    <p style={{ margin: 0 }}>Sede: Via XXIV Udine n. 43, Gradisca d’Isonzo (GO)</p>
                    <p style={{ margin: 0 }}>Email: garage.music.club2024@gmail.com</p>
                    <p style={{ margin: 0 }}>Tel: +39 389 7995206</p>
                    <p style={{ margin: 0 }}>C.F. 91050330314</p>
                </td>
            </tr>
        </tbody>
      </table>


      {/* Title */}
      <div
        className="no-break"
        style={{
          textAlign: "center",
          margin: "15px 0",
          borderTop: "2px solid black",
          borderBottom: "2px solid black",
          padding: "8px 0",
        }}
      >
        <h2 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, letterSpacing: "1px" }}>
          DOMANDA DI AMMISSIONE A SOCIO
        </h2>
      </div>

      {/* Main Info (tabella 2 colonne) */}
      <table className="no-break" style={{ width: "100%", borderSpacing: 0, marginBottom: "20px" }}>
        <tbody>
          <tr>
            <td style={{ width: "50%", paddingRight: "10px", verticalAlign: "top" }}>
              <Field label="COGNOME E NOME" value={fullName} />
            </td>
            <td style={{ width: "50%", paddingLeft: "10px", verticalAlign: "top" }}>
              <Field label="DATA DI NASCITA" value={formatDate(socio.birthDate)} />
            </td>
          </tr>

          <tr>
            <td style={{ paddingRight: "10px", paddingTop: "10px", verticalAlign: "top" }}>
              <Field label="LUOGO DI NASCITA" value={socio.birthPlace} />
            </td>
            <td style={{ paddingLeft: "10px", paddingTop: "10px", verticalAlign: "top" }}>
              <Field label="CODICE FISCALE" value={socio.fiscalCode} />
            </td>
          </tr>

          <tr>
            <td colSpan={2} style={{ paddingTop: "10px", verticalAlign: "top" }}>
              <Field label="INDIRIZZO DI RESIDENZA" value={address} />
            </td>
          </tr>

          <tr>
            <td style={{ paddingRight: "10px", paddingTop: "10px", verticalAlign: "top" }}>
              <Field label="TELEFONO" value={socio.phone} />
            </td>
            <td style={{ paddingLeft: "10px", paddingTop: "10px", verticalAlign: "top" }}>
              <Field label="EMAIL" value={socio.email} />
            </td>
          </tr>

          <tr>
            <td colSpan={2} style={{ paddingTop: "10px", verticalAlign: "top" }}>
              <Field label="QUALIFICA" value={socio.qualifica?.join(", ")} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* Consents */}
      <div className="no-break" style={{ marginBottom: "15px" }}>
        <h3
          style={{
            fontSize: "13px",
            fontWeight: "bold",
            margin: "0 0 10px 0",
            borderBottom: "1px solid #ccc",
            paddingBottom: "5px",
          }}
        >
          DICHIARAZIONI E CONSENSI
        </h3>
        <div style={{ fontSize: "10px", lineHeight: "1.5" }}>
          <div style={{ margin: "0 0 8px 0" }}>
            Il/La sottoscritto/a, letta l'informativa sul trattamento dei dati personali, chiede di
            essere ammesso/a come socio/a all'Associazione Culturale "Garage Music Club", di cui
            dichiara di aver preso visione dello statuto e dei regolamenti interni e di accettarli
            integralmente. Si impegna a versare la quota associativa annuale.
          </div>

          <div style={{ marginBottom: "8px" }}>
            <Checkbox checked={!!socio.whatsappConsent} />
            <b>Consenso WhatsApp:</b> Acconsente all'inserimento del proprio numero di telefono nel
            gruppo WhatsApp dell'associazione per comunicazioni relative alle attività.
          </div>

          <div>
            <Checkbox checked={!!socio.privacyConsent} />
            <b>Consenso Privacy (Art. 13 GDPR):</b> Dichiara di aver ricevuto, letto e compreso
            l'informativa sul trattamento dei dati personali e acconsente al trattamento dei propri
            dati personali per le finalità associative, inclusa la gestione del tesseramento e
            l'invio di comunicazioni istituzionali. Il consenso è obbligatorio per l'ammissione.
          </div>
        </div>
      </div>

      {/* Signatures */}
      <table className="no-break" style={{ width: "100%", marginTop: "20px", marginBottom: "20px", fontSize: "12px" }}>
        <tbody>
          <tr>
            <td style={{ width: "50%" }}>Data: _________________________</td>
            <td style={{ width: "50%", textAlign: "right" }}>Firma del Socio: _________________________</td>
          </tr>
        </tbody>
      </table>

      {/* Guardian Section (if minor) */}
      {isMinor && (
        <div className="no-break" style={{ marginTop: "15px", marginBottom: "20px" }}>
          <h3
            style={{
              fontSize: "13px",
              fontWeight: "bold",
              margin: "0 0 10px 0",
              borderTop: "1px solid #000",
              borderBottom: "1px solid #000",
              padding: "5px 0",
              textAlign: "center",
            }}
          >
            PARTE RISERVATA AL GENITORE O A CHI NE FA LE VECI
          </h3>

          <div style={{ fontSize: "10px", lineHeight: "1.5", margin: "0 0 10px 0", textAlign: "justify" }}>
            Il/La sottoscritto/a{" "}
            <b>{cleanOneLine(`${socio.guardianLastName || ""} ${socio.guardianFirstName || ""}`)}</b>,
            nato/a a ________________ il <b>{formatDate(socio.guardianBirthDate)}</b>, in qualità di
            genitore/tutore legale del minore sopra indicato, dichiara di approvare la presente
            domanda di ammissione e di accettare lo statuto e i regolamenti dell'associazione.
          </div>

          <table style={{ width: "100%", fontSize: "12px", marginTop: "10px" }}>
            <tbody>
              <tr>
                <td style={{ width: "50%" }}>Data: _________________________</td>
                <td style={{ width: "50%", textAlign: "right" }}>
                  Firma del Genitore/Tutore: _________________________
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Association Box */}
      <div
        className="no-break"
        style={{
          border: "2px solid black",
          padding: "15px",
          marginTop: "10px",
          pageBreakInside: "avoid",
        }}
      >
        <h3 style={{ fontSize: "12px", fontWeight: "bold", margin: "0 0 10px 0", textAlign: "center" }}>
          RISERVATO ALL'ASSOCIAZIONE
        </h3>

        <table style={{ width: "100%", borderSpacing: "0", fontSize: "11px" }}>
          <tbody>
            <tr>
              <td style={{ width: "50%", paddingRight: "10px", verticalAlign: "top" }}>
                <Field label="N. TESSERA" value={socio.tessera} />
              </td>
              <td style={{ width: "50%", paddingLeft: "10px", verticalAlign: "top" }}>
                <Field label={relevantDateLabel} value={formatDate(relevantDateValue)} />
              </td>
            </tr>
            <tr>
              <td style={{ paddingTop: "10px", paddingRight: "10px", verticalAlign: "top" }}>
                <Field label="ANNO ASSOCIATIVO" value={socio.membershipYear} />
              </td>
              <td style={{ paddingTop: "10px", paddingLeft: "10px", verticalAlign: "top" }}>
                <Field
                  label="QUOTA VERSATA"
                  value={
                    typeof socio.membershipFee === "number"
                      ? new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
                          socio.membershipFee
                        )
                      : ""
                  }
                />
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ paddingTop: "15px" }}>
                <p style={{ margin: 0 }}>
                  Il Consiglio Direttivo, esaminata la domanda, delibera l'ammissione a socio.
                </p>
              </td>
            </tr>
            <tr>
              <td style={{ paddingTop: "20px" }}>Data: _________________________</td>
              <td style={{ paddingTop: "20px", textAlign: "right" }}>
                Il Presidente: _________________________
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Notes Section */}
      {socio.notes && socio.notes.trim() !== "" && (
        <div className="no-break" style={{ marginTop: "15px" }}>
          <h3
            style={{
              fontSize: "13px",
              fontWeight: "bold",
              margin: "0 0 10px 0",
              borderBottom: "1px solid #ccc",
              paddingBottom: "5px",
            }}
          >
            NOTE AMMINISTRATIVE
          </h3>
          <div style={{ fontSize: "11px", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
            {socio.notes}
          </div>
        </div>
      )}
    </div>
  );
}
