import * as XLSX from 'xlsx';
import { type Socio } from './soci-data';
import { formatDate, normalizeSocioData, getStatus } from '@/lib/utils';

const statusTranslations: Record<string, string> = {
  active: 'Attivo',
  suspended: 'Sospeso',
  expired: 'Scaduto',
  pending: 'In Attesa',
  rejected: 'Rifiutato'
};

/**
 * Funzione di utilità per estrarre solo il numero dalla tessera
 * Se il formato è 2024/005, ritorna 5.
 */
function extractTesseraNumber(tessera: string | undefined): number {
  if (!tessera) return 999999;
  // Cerchiamo l'ultimo blocco di cifre in caso ci siano separatori (es. 2024/005 -> 005)
  const parts = String(tessera).split(/[\/\-\. ]/);
  const lastPart = parts[parts.length - 1].replace(/\D/g, '');
  const num = parseInt(lastPart, 10);
  return isNaN(num) ? 999999 : num;
}

/**
 * Formatta un singolo socio/richiesta per una riga Excel secondo il rigido ordine richiesto
 */
function formatSocioRow(item: any) {
  try {
    const s = normalizeSocioData(item as Socio);
    // Usiamo la logica ufficiale getStatus per la coerenza con la UI
    const status = getStatus(s, item._isMember !== false);
    
    // Logica TIPO elaborata: NUOVO, RINNOVO, RIFIUTATO, SCADUTO, RICHIESTA
    let tipo = 'NUOVO';
    if (status === 'rejected') {
      tipo = 'RIFIUTATO';
    } else if (status === 'expired') {
      tipo = 'SCADUTO';
    } else if (status === 'pending') {
      tipo = 'RICHIESTA';
    } else if (s.renewalDate && s.renewalDate !== s.joinDate) {
      tipo = 'RINNOVO';
    }
    
    // Formattazione Date (usando quella di utils o locale)
    const fmtDate = (date: any) => {
      if (!date) return '';
      return formatDate(date, 'dd/MM/yyyy');
    };

    // Costruiamo l'oggetto con le chiavi nell'ordine richiesto
    const row: any = {};
    row['TIPO'] = tipo;
    row['N. TESSERA'] = extractTesseraNumber(s.tessera) === 999999 ? (s.tessera || '') : extractTesseraNumber(s.tessera);
    row['ANNO ASSOCIATIVO'] = s.membershipYear || '';
    row['NOME'] = s.firstName || '';
    row['COGNOME'] = s.lastName || '';
    row['SESSO'] = s.gender === 'female' ? 'F' : (s.gender === 'male' ? 'M' : '');
    row['DATA DI NASCITA'] = fmtDate(s.birthDate);
    row['LUOGO DI NASCITA'] = s.birthPlace || '';
    row['CODICE FISCALE'] = s.fiscalCode || '';
    row['EMAIL'] = s.email || '';
    row['TELEFONO'] = s.phone || '';
    row['CONSENSO WHATSAPP'] = s.whatsappConsent ? 'SÌ' : 'NO';
    row['INDIRIZZO'] = s.address || '';
    row['CITTÀ'] = s.city || '';
    row['PROV.'] = s.province || '';
    row['CAP'] = s.postalCode || '';
    row['QUALIFICHE'] = Array.isArray(s.qualifica) ? s.qualifica.join(', ') : (s.qualifica || '');
    
    // Dati Tutore
    const tutoreNome = [s.guardianFirstName, s.guardianLastName].filter(Boolean).join(' ');
    row['TUTORE'] = tutoreNome;
    row['DATA NASCITA TUTORE'] = fmtDate(s.guardianBirthDate);
    
    row['DATA RICHIESTA'] = fmtDate(s.requestDate);
    row['DATA ISCRIZIONE'] = fmtDate(s.joinDate);
    row['ULTIMO RINNOVO'] = fmtDate(s.renewalDate);
    row['SCADENZA'] = fmtDate(s.expirationDate);
    row['STATO'] = statusTranslations[status] || status || '';
    row['NOTE'] = s.notes || '';

    // Aggiungiamo un campo nascosto per il filtraggio successivo dei fogli
    row._finalStatus = status;

    return row;
  } catch (e) {
    console.error("Errore formattazione riga:", e, item);
    return { 'ERRORE': 'Dati non validi', 'ID': item.id, _finalStatus: 'error' };
  }
}

export async function exportToExcel(soci: Socio[], richieste: any[]) {
  try {
    console.log("ExportToExcel: Avvio generazione multi-foglio...");

    // 1. Unifichiamo e processiamo tutti i dati (Membri + Richieste) per non perdere nessuno
    const allData = [
      ...soci.map(s => ({ ...s, _isMember: true })),
      ...richieste.map(r => ({ ...r, _isMember: false }))
    ];

    const allRowsWithStatus = allData.map(formatSocioRow);

    // 2. Distribuzione nei 4 fogli basata sullo STATO calcolato da getStatus
    const attiviRows = allRowsWithStatus.filter(r => r._finalStatus === 'active');
    const sospesiRows = allRowsWithStatus.filter(r => r._finalStatus === 'expired');
    const richiesteRows = allRowsWithStatus.filter(r => r._finalStatus === 'pending');
    const eliminatiRows = allRowsWithStatus.filter(r => r._finalStatus === 'rejected');

    // Funzione di ordinamento per tessera
    const sortFn = (a: any, b: any) => {
      const numA = typeof a['N. TESSERA'] === 'number' ? a['N. TESSERA'] : 999999;
      const numB = typeof b['N. TESSERA'] === 'number' ? b['N. TESSERA'] : 999999;
      return numA - numB;
    };

    const finalAttivi = attiviRows.sort(sortFn);
    const finalSospesi = sospesiRows.sort(sortFn);
    const finalRichieste = richiesteRows.sort(sortFn);
    const finalEliminati = eliminatiRows.sort(sortFn);

    // Rimuoviamo il campo di servizio prima di creare il foglio
    const cleanRows = (rows: any[]) => rows.map(({ _finalStatus, ...rest }) => rest);

    // 3. Creazione Workbook e Fogli
    const workbook = XLSX.utils.book_new();
    
    const addSheet = (rows: any[], name: string) => {
      const cleaned = cleanRows(rows);
      let ws;
      if (cleaned.length === 0) {
        // Headers fissi per fogli vuoti
        const headers = ["TIPO", "N. TESSERA", "ANNO ASSOCIATIVO", "NOME", "COGNOME", "SESSO", "DATA DI NASCITA", "LUOGO DI NASCITA", "CODICE FISCALE", "EMAIL", "TELEFONO", "CONSENSO WHATSAPP", "INDIRIZZO", "CITTÀ", "PROV.", "CAP", "QUALIFICHE", "TUTORE", "DATA NASCITA TUTORE", "DATA RICHIESTA", "DATA ISCRIZIONE", "ULTIMO RINNOVO", "SCADENZA", "STATO", "NOTE"];
        ws = XLSX.utils.aoa_to_sheet([headers]);
      } else {
        ws = XLSX.utils.json_to_sheet(cleaned);
      }
      
      const wscols = Array.from({ length: 25 }).map(() => ({ wch: 18 }));
      ws['!cols'] = wscols;
      XLSX.utils.book_append_sheet(workbook, ws, name);
    };

    addSheet(finalAttivi, "SOCI ATTIVI");
    addSheet(finalSospesi, "SOCI SOSPESI");
    addSheet(finalRichieste, "RICHIESTE");
    addSheet(finalEliminati, "SOCI ELIMINATI");

    // 4. Generazione File e Download
    const today = formatDate(new Date(), 'dd.MM.yyyy');
    const fileName = `ANAGRAFICA SOCI GMC ${today}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
    console.log("Export completato con successo:", fileName);

  } catch (error: any) {
    console.error("Errore critico exportToExcel:", error);
    if (typeof window !== 'undefined') {
      alert("Errore durante l'esportazione: " + (error.message || "Errore sconosciuto"));
    }
  }
}
