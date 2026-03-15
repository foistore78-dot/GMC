
"use client";

import { useState, useEffect } from "react";
import { GarageMusicClubLogo } from "@/components/icons/garage-music-club-logo";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Printer } from "lucide-react";
import Link from "next/link";

const Field = ({ label, placeholder, defaultValue, className, style }: { label: string; placeholder?: string; defaultValue?: string; className?: string; style?: React.CSSProperties }) => (
  <div className={`w-full ${className}`} style={style}>
    <div style={{ fontSize: "9px", textTransform: "uppercase", color: "#6b7280", margin: "0 0 2px 0", letterSpacing: "0.5px" }}>
      {label}
    </div>
    <input
      type="text"
      placeholder={placeholder}
      defaultValue={defaultValue}
      className="w-full border-b border-gray-300 focus:border-black outline-none py-1 text-[12px] font-bold bg-transparent print:border-gray-200"
      style={{ minHeight: "24px" }}
    />
  </div>
);

const Checkbox = ({ label, defaultChecked, className }: { label: string; defaultChecked?: boolean; className?: string }) => (
  <div className={`flex items-start gap-2 mb-2 cursor-pointer ${className}`}>
    <input 
      type="checkbox" 
      defaultChecked={defaultChecked}
      className="w-4 h-4 border border-black mt-0.5 flex-shrink-0 cursor-pointer" 
    />
    <div style={{ fontSize: "10px", lineHeight: "1.4" }}>
      <b>{label}</b>
    </div>
  </div>
);

const InlineInput = ({ placeholder, width = "150px" }: { placeholder?: string; width?: string }) => (
  <input
    type="text"
    placeholder={placeholder}
    className="border-b border-gray-300 focus:border-black outline-none px-1 text-[11px] font-bold bg-transparent inline-block text-center"
    style={{ width, margin: "0 4px" }}
  />
);

export default function ModuloOfflinePage() {
  const [generationDate, setGenerationDate] = useState<string>("");
  const [currentYear, setCurrentYear] = useState<string>("2025");

  useEffect(() => {
    const now = new Date();
    setGenerationDate(now.toLocaleDateString());
    setCurrentYear(now.getFullYear().toString());
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:p-0 print:bg-white">
      {/* Menu Azioni - Nascosto in stampa */}
      <div className="max-w-[18cm] mx-auto mb-6 flex justify-between items-center px-4 print:hidden">
        <Button variant="ghost" asChild>
          <Link href="/admin/elenco">
            <ChevronLeft className="mr-2 h-4 w-4" /> Torna all'Elenco
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Stampa o Salva PDF
          </Button>
        </div>
      </div>

      {/* Area del Modulo */}
      <div className="bg-white shadow-2xl mx-auto p-[1.5cm] w-[21cm] min-h-[29.7cm] print:shadow-none print:p-[1cm] print:w-full print:min-h-0 text-black font-sans flex flex-col">
        <style jsx global>{`
          @media print {
            body { background: white !important; }
            .print\\:hidden { display: none !important; }
            @page { size: A4; margin: 0; }
          }
          input::placeholder { color: #d1d5db; font-weight: normal; }
        `}</style>

        {/* Header */}
        <table style={{ width: '100%', borderSpacing: 0, marginBottom: '10px' }}>
          <tbody>
            <tr>
              <td style={{ width: '60px', paddingRight: '10px', verticalAlign: 'middle' }}>
                <div style={{ width: '60px', height: '60px' }}>
                  <GarageMusicClubLogo size={60} />
                </div>
              </td>
              <td style={{ textAlign: 'left', verticalAlign: 'middle', padding: '0 10px' }}>
                <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "22px", fontWeight: "bold", margin: 0, letterSpacing: "0.05em" }}>
                  GARAGE MUSIC CLUB
                </h1>
                <p style={{ fontSize: "13px", margin: 0 }}>Associazione Culturale</p>
              </td>
              <td style={{ verticalAlign: 'middle', textAlign: 'right', fontSize: '10px', lineHeight: '1.4', width: '200px' }}>
                <p style={{ margin: 0 }}>Sede: Via XXIV Udine n. 43, Gradisca d’Isonzo (GO)</p>
                <p style={{ margin: 0 }}>Email: garage.music.club2024@gmail.com</p>
                <p style={{ margin: 0 }}>Tel: +39 389 7995206</p>
                <p style={{ margin: 0 }}>C.F. 91050330314</p>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Titolo Documento */}
        <div style={{ textAlign: "center", margin: "15px 0", borderTop: "2px solid black", borderBottom: "2px solid black", padding: "8px 0" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, letterSpacing: "1px" }}>
            DOMANDA DI AMMISSIONE A SOCIO (MODULO DI EMERGENZA)
          </h2>
        </div>

        {/* Sezione Dati Anagrafici */}
        <div className="space-y-6 mb-8">
          <div className="grid grid-cols-2 gap-8">
            <Field label="COGNOME E NOME" placeholder="Es. Rossi Mario" />
            <Field label="DATA DI NASCITA" placeholder="GG/MM/AAAA" />
          </div>

          <div className="grid grid-cols-2 gap-8">
            <Field label="LUOGO DI NASCITA" placeholder="Es. Gradisca d'Isonzo" />
            <Field label="CODICE FISCALE" placeholder="RSSMRA80A01..." />
          </div>

          <Field label="INDIRIZZO DI RESIDENZA" placeholder="Es. Via Roma 1, 34072 Gradisca d'Isonzo (GO)" />

          <div className="grid grid-cols-2 gap-8">
            <Field label="TELEFONO" placeholder="+39 333 1234567" />
            <Field label="EMAIL" placeholder="mario.rossi@esempio.it" />
          </div>
        </div>

        {/* Dichiarazioni e Consensi */}
        <div className="mb-8">
          <h3 style={{ fontSize: "13px", fontWeight: "bold", margin: "0 0 10px 0", borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>
            DICHIARAZIONI E CONSENSI
          </h3>
          <div style={{ fontSize: "10px", lineHeight: "1.5" }}>
            <p className="mb-4">
              Il/La sottoscritto/a, letta l'informativa sul trattamento dei dati personali, chiede di essere ammesso/a come socio/a all'Associazione Culturale "Garage Music Club", di cui dichiara di aver preso visione dello statuto e dei regolamenti interni e di accettarli integralmente. Si impegna a versare la quota associativa annuale.
            </p>
            
            <Checkbox label="Consenso WhatsApp: Acconsente all'inserimento del proprio numero di telefono nel gruppo WhatsApp dell'associazione per comunicazioni relative alle attività." />
            
            <Checkbox defaultChecked={true} label="Consenso Privacy (Art. 13 GDPR): Dichiara di aver ricevuto, letto e compreso l'informativa sul trattamento dei dati personali e acconsente al trattamento dei propri dati personali per le finalità associative (Obbligatorio per l'ammissione)." />
          </div>
        </div>

        {/* Firme */}
        <div className="grid grid-cols-2 gap-8 mb-10 text-[12px]">
          <div>Data: <InlineInput width="120px" placeholder="GG/MM/AAAA" /></div>
          <div style={{ textAlign: "right" }}>Firma del Socio: _________________________</div>
        </div>

        {/* Sezione Minori */}
        <div style={{ border: "1px dashed #ccc", padding: "15px", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "12px", fontWeight: "bold", margin: "0 0 10px 0", textAlign: "center", textTransform: "uppercase" }}>
            Per Soci Minorenni
          </h3>
          <p style={{ fontSize: "10px", marginBottom: "10px", lineHeight: "2" }}>
            Il/La sottoscritto/a <InlineInput width="250px" placeholder="Nome e Cognome Tutore" /> nato/a a <InlineInput width="150px" placeholder="Luogo di Nascita" /> il <InlineInput width="100px" placeholder="GG/MM/AAAA" />, in qualità di genitore/tutore legale del minore, dichiara di approvare la presente domanda.
          </p>
          <div className="grid grid-cols-2 gap-8 text-[11px] mt-4">
            <div>Data: <InlineInput width="120px" placeholder="GG/MM/AAAA" /></div>
            <div style={{ textAlign: "right" }}>Firma Tutore: _________________________</div>
          </div>
        </div>

        {/* Parte Riservata Associazione */}
        <div style={{ border: "2px solid black", padding: "15px", marginTop: "auto" }}>
          <h3 style={{ fontSize: "12px", fontWeight: "bold", margin: "0 0 10px 0", textAlign: "center" }}>
            RISERVATO ALL'ASSOCIAZIONE
          </h3>
          
          <div className="grid grid-cols-2 gap-8 mb-4">
            <Field label="N. TESSERA" defaultValue={`GMC-${currentYear}-`} />
            <Field label="DATA AMMISSIONE" placeholder="GG/MM/AAAA" />
          </div>
          
          <div className="grid grid-cols-2 gap-8 mb-4">
            <Field label="ANNO ASSOCIATIVO" defaultValue={currentYear} />
            <Field label="QUOTA VERSATA (€)" placeholder="Es. 10.00" />
          </div>

          <div className="mt-2 mb-4">
            <div style={{ fontSize: "9px", textTransform: "uppercase", color: "#6b7280", margin: "0 0 4px 0", letterSpacing: "0.5px" }}>
              QUALIFICA
            </div>
            <div className="flex gap-6">
              <Checkbox label="FONDATORE" className="mb-0" />
              <Checkbox label="VOLONTARIO" className="mb-0" />
              <Checkbox label="MUSICISTA" className="mb-0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 text-[11px] mt-2">
            <div>Data: <InlineInput width="120px" placeholder="GG/MM/AAAA" /></div>
          </div>
        </div>

        <div className="mt-6 text-center text-[9px] text-gray-400 print:block">
          Modulo generato digitalmente dal Manager GMC il {generationDate}
        </div>
      </div>
    </div>
  );
}
