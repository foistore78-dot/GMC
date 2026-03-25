import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { type Socio } from './soci-data';
import { formatDate, normalizeSocioData, getStatus } from '@/lib/utils';

const statusTranslations: Record<string, string> = {
  active: 'Attivo',
  suspended: 'Sospeso',
  expired: 'Scaduto',
  pending: 'In Attesa',
  rejected: 'Rifiutato'
};

function cleanString(val: any): any {
  if (typeof val !== 'string') return val;
  // Rimozione aggressiva di caratteri non stampabili
  return val.replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
}

function extractTesseraNumber(tessera: string | undefined): number {
  if (!tessera) return 999999;
  const parts = String(tessera).split(/[\/\-\. ]/);
  const lastPart = parts[parts.length - 1].replace(/\D/g, '');
  const num = parseInt(lastPart, 10);
  return isNaN(num) ? 999999 : num;
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

    const row: any = {};
    row['Stato'] = statusTranslations[status] || status || '';
    row['N. Tessera'] = s.tessera || '';
    row['Cognome'] = cleanString(s.lastName);
    row['Nome'] = cleanString(s.firstName);
    row['Genere'] = s.gender === 'female' ? 'Femmina' : 'Maschio';
    row['Data di Nascita'] = fmtDate(s.birthDate);
    row['Luogo di Nascita'] = cleanString(s.birthPlace);
    row['Codice Fiscale'] = cleanString(s.fiscalCode);
    row['Indirizzo'] = cleanString(s.address);
    row['Città'] = cleanString(s.city);
    row['Provincia'] = cleanString(s.province);
    row['CAP'] = s.postalCode || '';
    row['Email'] = cleanString(s.email);
    row['Telefono'] = s.phone || '';
    row['Consenso WhatsApp'] = s.whatsappConsent ? 'SI' : 'NO';
    row['Consenso Privacy'] = s.privacyConsent ? 'SI' : 'NO';
    row['Anno Associativo'] = s.membershipYear || '';
    row['Data Richiesta'] = fmtDate(s.requestDate);
    row['Data Ammissione'] = fmtDate(s.joinDate);
    row['Data Rinnovo'] = fmtDate(s.renewalDate);
    row['Data Scadenza'] = fmtDate(s.expirationDate);
    row['Quota Versata (€)'] = 0;
    row['Qualifiche'] = Array.isArray(s.qualifica) ? s.qualifica.join(', ') : (s.qualifica || '');
    row['Note'] = cleanString(s.notes);
    row['Nome Tutore'] = cleanString(s.guardianFirstName);
    row['Cognome Tutore'] = cleanString(s.guardianLastName);
    row['Data Nascita Tutore'] = fmtDate(s.guardianBirthDate);
    row['TIPO'] = (status === 'pending') ? 'RICHIESTA' : (status === 'rejected' ? 'RIFIUTATO' : (s.renewalDate && s.renewalDate !== s.joinDate ? 'RINNOVO' : 'NUOVO'));
    
    row._finalStatus = status;
    row._tesseraNum = extractTesseraNumber(s.tessera);

    return row;
  } catch (e) {
    return { 'Stato': 'Errore', 'Cognome': 'DATI CORROTTI', _finalStatus: 'error' };
  }
}

function s2ab(s: string) {
  const buf = new ArrayBuffer(s.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i !== s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
  return buf;
}

export async function exportToExcel(soci: Socio[], richieste: any[]) {
  console.log("--- DEBUG EXPORT START ---");
  console.log("Libreria XLSX presente:", !!XLSX);
  console.log("Membri:", soci?.length, "Richieste:", richieste?.length);
  
  try {
    if (!XLSX) throw new Error("Libreria XLSX non caricata correttamente");
    if (!soci) throw new Error("Dati soci mancanti");

    const allData = [
      ...soci.map(s => ({ ...s, _isMember: true })),
      ...(richieste || []).map(r => ({ ...r, _isMember: false }))
    ];

    const allRowsWithStatus = allData.map(formatSocioRow);
    const attiviRows = allRowsWithStatus.filter(r => r._finalStatus === 'active');
    const sospesiRows = allRowsWithStatus.filter(r => r._finalStatus === 'expired');
    const richiesteRows = allRowsWithStatus.filter(r => r._finalStatus === 'pending');
    const eliminatiRows = allRowsWithStatus.filter(r => r._finalStatus === 'rejected');

    console.log("Righe processate:", { 
      attivi: attiviRows.length, 
      sospesi: sospesiRows.length, 
      richieste: richiesteRows.length, 
      eliminati: eliminatiRows.length 
    });

    const sortFn = (a: any, b: any) => (a._tesseraNum || 999999) - (b._tesseraNum || 999999);
    const workbook = XLSX.utils.book_new();
    
    [
      { data: attiviRows.sort(sortFn), name: "SOCI ATTIVI" },
      { data: sospesiRows.sort(sortFn), name: "SOCI SOSPESI" },
      { data: richiesteRows.sort(sortFn), name: "RICHIESTE" },
      { data: eliminatiRows.sort(sortFn), name: "SOCI ELIMINATI" }
    ].forEach(sheet => {
      const cleanedData = sheet.data.map(({ _finalStatus, _tesseraNum, ...rest }) => rest);
      let ws;
      if (cleanedData.length === 0) {
        const headers = ["Stato", "N. Tessera", "Cognome", "Nome", "Genere", "Data di Nascita", "Luogo di Nascita", "Codice Fiscale", "Indirizzo", "Città", "Provincia", "CAP", "Email", "Telefono", "Consenso WhatsApp", "Consenso Privacy", "Anno Associativo", "Data Richiesta", "Data Ammissione", "Data Rinnovo", "Data Scadenza", "Quota Versata (€)", "Qualifiche", "Note", "Nome Tutore", "Cognome Tutore", "Data Nascita Tutore", "TIPO"];
        ws = XLSX.utils.aoa_to_sheet([headers]);
      } else {
        ws = XLSX.utils.json_to_sheet(cleanedData);
      }
      ws['!cols'] = Object.keys(cleanedData[0] || {}).map(() => ({ wch: 15 }));
      XLSX.utils.book_append_sheet(workbook, ws, sheet.name);
    });

    const now = new Date();
    const fileName = `EXPORT_GMC_${now.getFullYear()}${now.getMonth()+1}${now.getDate()}.xlsx`;

    console.log("Scrittura workbook (binary)...");
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
    
    console.log("Creazione Blob...");
    const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
    
    console.log("Download file:", fileName, "Size:", blob.size);
    
    if (blob.size < 100) {
        throw new Error("Il file generato è troppo piccolo, possibile errore interno");
    }

    saveAs(blob, fileName);
    
    console.log("--- DEBUG EXPORT SUCCESS ---");
  } catch (error: any) {
    console.error("ERRORE EXPORT:", error);
    alert("ERRORE CRITICO EXPORT: " + error.message + "\nControlla la console (F12) per i dettagli.");
  }
}
