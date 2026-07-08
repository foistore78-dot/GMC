import * as XLSX from 'xlsx';
import { type Socio } from './soci-data';
import { formatDate, normalizeSocioData, getStatus, getSignatureMetadata } from '@/lib/utils';

const statusTranslations: Record<string, string> = {
  active: 'Attivo',
  suspended: 'Sospeso',
  expired: 'Scaduto',
  pending: 'In Attesa',
  rejected: 'Rifiutato'
};

function cleanString(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val !== 'string') return String(val);
  // Rimozione aggressiva di caratteri non stampabili che potrebbero corrompere l'Excel
  return val.replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
}

function extractTesseraNumber(tessera: string | undefined): number {
  if (!tessera) return 999999;
  const parts = String(tessera).split(/[\/\-\. ]/);
  const lastPart = parts[parts.length - 1].replace(/\D/g, '');
  const num = parseInt(lastPart, 10);
  return isNaN(num) ? 999999 : num;
}

function formatSignatureForExcel(socio: Socio): string {
  const sig = getSignatureMetadata(socio);
  if (sig.method === 'SMS_OTP') {
    const formattedDate = sig.signedAt ? formatDate(sig.signedAt, 'dd/MM/yyyy HH:mm') : '';
    return `Firma OTP - Tel: ${sig.signerPhone || ''} - Data: ${formattedDate} - ID: ${sig.verificationId || ''}`;
  } else if (sig.method === 'MANUAL_PAPER') {
    return 'Modulo cartaceo';
  } else if (sig.method === 'ADMIN_DIRECT') {
    return 'Firma mancante';
  }
  return 'Nessuna firma';
}

function formatSocioRow(item: any) {
  try {
    const s = normalizeSocioData(item as Socio);
    const isMemberValue = item._isMember !== false;
    const status = getStatus(s, isMemberValue);
    
    const fmtDate = (date: any) => {
      if (!date) return '';
      return formatDate(date, 'dd/MM/yyyy');
    };

    const tesseraNum = extractTesseraNumber(s.tessera);
    const row: any = {};
    row['Anno Associativo'] = cleanString(s.membershipYear);
    row['TIPO'] = (status === 'pending') ? 'RICHIESTA' : (status === 'rejected' ? 'RIFIUTATO' : (s.renewalDate && s.renewalDate !== s.joinDate ? 'RINNOVO' : 'NUOVO'));
    row['N. Tessera'] = tesseraNum === 999999 ? '' : tesseraNum;
    row['Cognome'] = cleanString(s.lastName);
    row['Nome'] = cleanString(s.firstName);
    row['Genere'] = s.gender === 'female' ? 'Femmina' : 'Maschio';
    row['Data di Nascita'] = fmtDate(s.birthDate);
    row['Luogo di Nascita'] = cleanString(s.birthPlace);
    row['Codice Fiscale'] = cleanString(s.fiscalCode).toUpperCase();
    row['Indirizzo'] = cleanString(s.address);
    row['Città'] = cleanString(s.city);
    row['Provincia'] = cleanString(s.province).toUpperCase();
    row['CAP'] = cleanString(s.postalCode);
    row['Email'] = cleanString(s.email).toLowerCase();
    row['Telefono'] = cleanString(s.phone);
    row['Consenso WhatsApp'] = s.whatsappConsent ? 'SI' : 'NO';
    row['Consenso Privacy'] = s.privacyConsent ? 'SI' : 'NO';
    row['Data Richiesta'] = fmtDate(s.requestDate);
    row['Data Ammissione'] = fmtDate(s.joinDate);
    row['Data Rinnovo'] = fmtDate(s.renewalDate);
    row['Data Scadenza'] = fmtDate(s.expirationDate);
    row['Quota Versata (€)'] = s.membershipFee || 0;
    row['Qualifiche'] = Array.isArray(s.qualifica) ? s.qualifica.join(', ') : (s.qualifica || '');
    row['Firma'] = formatSignatureForExcel(s);
    row['Note'] = cleanString(s.notes);
    row['Nome Tutore'] = cleanString(s.guardianFirstName);
    row['Cognome Tutore'] = cleanString(s.guardianLastName);
    row['Data Nascita Tutore'] = fmtDate(s.guardianBirthDate);
    
    // Campi tecnici nascosti per ordinamento e filtraggio
    row._finalStatus = status;
    row._tesseraNum = extractTesseraNumber(s.tessera);

    return row;
  } catch (e) {
    return { 'Cognome': 'DATI CORROTTI', _finalStatus: 'error', _tesseraNum: 999999 };
  }
}

export async function exportToExcel(soci: Socio[], richieste: any[]) {
  try {
    if (!XLSX) throw new Error("Libreria XLSX non caricata.");

    const allData = [
      ...soci.map(s => ({ ...s, _isMember: true })),
      ...(richieste || []).map(r => ({ ...r, _isMember: false }))
    ];

    const allRowsWithStatus = allData.map(formatSocioRow);
    const sortFn = (a: any, b: any) => (a._tesseraNum || 999999) - (b._tesseraNum || 999999);
    
    const attiviRows = allRowsWithStatus.filter(r => r._finalStatus === 'active').sort(sortFn);
    const sospesiRows = allRowsWithStatus.filter(r => r._finalStatus === 'expired').sort(sortFn);
    const richiesteRows = allRowsWithStatus.filter(r => r._finalStatus === 'pending').sort(sortFn);
    const eliminatiRows = allRowsWithStatus.filter(r => r._finalStatus === 'rejected').sort(sortFn);

    const workbook = XLSX.utils.book_new();
    
    // Ordine fogli: ATTIVI, SOSPESI, RICHIESTE, RESPINTI, e infine TUTTI
    const allSorted = [...allRowsWithStatus].sort(sortFn);
    const sheetConfigs = [
      { data: attiviRows, name: "ATTIVI" },
      { data: sospesiRows, name: "SOSPESI" },
      { data: richiesteRows, name: "RICHIESTE" },
      { data: eliminatiRows, name: "RESPINTI" },
      { data: allSorted, name: "TUTTI" }
    ];

    sheetConfigs.forEach(sheet => {
      const cleanedData = sheet.data.map(({ _finalStatus, _tesseraNum, ...rest }) => rest);
      let ws;
      if (cleanedData.length === 0) {
        const headers = ["Anno Associativo", "TIPO", "N. Tessera", "Cognome", "Nome", "Genere", "Data di Nascita", "Luogo di Nascita", "Codice Fiscale", "Indirizzo", "Città", "Provincia", "CAP", "Email", "Telefono", "Consenso WhatsApp", "Consenso Privacy", "Data Richiesta", "Data Ammissione", "Data Rinnovo", "Data Scadenza", "Quota Versata (€)", "Qualifiche", "Firma", "Note", "Nome Tutore", "Cognome Tutore", "Data Nascita Tutore"];
        ws = XLSX.utils.aoa_to_sheet([headers]);
      } else {
        ws = XLSX.utils.json_to_sheet(cleanedData);
      }
      
      // Imposta larghezza automatica colonne (base 15)
      ws['!cols'] = Object.keys(cleanedData[0] || {}).map(() => ({ wch: 15 }));
      XLSX.utils.book_append_sheet(workbook, ws, sheet.name);
    });

    // 2. Generazione e Trigger Download (Chrome-Friendly)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const fileName = `Elenco soci GMC - ${day}-${month}-${year}.xlsx`;

    // Utilizzo XLSX.writeFile che è il metodo più testato per Chrome
    // Se fallisce in "anteprima", usiamo un fallback esplicito
    try {
      XLSX.writeFile(workbook, fileName);
    } catch (writeErr) {
      console.warn("XLSX.writeFile fallito, provo trigger manuale...", writeErr);
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 1000);
    }
    
    
  } catch (error: any) {
    console.error("ERRORE EXPORT:", error);
    alert("ERRORE DURANTE L'EXPORT: " + error.message);
  }
}
