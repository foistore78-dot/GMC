import * as XLSX from 'xlsx';
import type { Socio } from './soci-data';
import { getStatus, formatDate } from '@/components/soci-table';

const statusTranslations: Record<string, string> = {
  active: 'Attivo',
  pending: 'Sospeso',
  rejected: 'Rifiutato',
  expired: 'Scaduto'
};

const formatForExcel = (data: Socio[], isMember: boolean) => {
  return data.map(socio => {
    const status = getStatus(socio);
    return {
      'N. Tessera': isMember ? socio.tessera || 'N/A' : 'N/A',
      'Cognome': socio.lastName,
      'Nome': socio.firstName,
      'Stato': statusTranslations[status] || status,
      'Genere': socio.gender === 'male' ? 'M' : 'F',
      'Data di Nascita': formatDate(socio.birthDate),
      'Luogo di Nascita': socio.birthPlace,
      'Codice Fiscale': socio.fiscalCode,
      'Indirizzo': `${socio.address}, ${socio.postalCode} ${socio.city} (${socio.province})`,
      'Email': socio.email,
      'Telefono': socio.phone,
      'Consenso WhatsApp': socio.whatsappConsent ? 'SI' : 'NO',
      'Consenso Privacy': socio.privacyConsent ? 'SI' : 'NO',
      'Anno Associativo': socio.membershipYear,
      'Data Richiesta': formatDate(socio.requestDate),
      'Data Ammissione': formatDate(socio.joinDate),
      'Data Rinnovo': formatDate(socio.renewalDate),
      'Data Scadenza': formatDate(socio.expirationDate),
      'Quota Versata (€)': socio.membershipFee,
      'Qualifiche': socio.qualifica?.join(', ') || '',
      'Tutore': socio.guardianFirstName ? `${socio.guardianLastName || ''} ${socio.guardianFirstName || ''}`.trim() : '',
      'Data Nascita Tutore': socio.guardianBirthDate ? formatDate(socio.guardianBirthDate) : '',
      'Note': socio.notes
    };
  });
};

export const exportToExcel = (members: Socio[], requests: Socio[]) => {
  // Foglio 1: Soci Attivi e Scaduti
  const activeAndExpiredMembers = members;
  const membersSheetData = formatForExcel(activeAndExpiredMembers, true);
  const membersWorksheet = XLSX.utils.json_to_sheet(membersSheetData);

  // Foglio 2: Richieste Iscrizione
  const pendingRequests = requests;
  const requestsSheetData = formatForExcel(pendingRequests, false);
  const requestsWorksheet = XLSX.utils.json_to_sheet(requestsSheetData);

  // Auto-dimensionamento colonne
  const fitToColumn = (data: any[]) => {
    if (data.length === 0) return [];
    const json = data;
    const widths: { wch: number }[] = [];
    for (const key in json[0]) {
        widths.push({ wch: Math.max(...json.map(item => (item[key] || '').toString().length), key.length) });
    }
    return widths;
  };
  
  membersWorksheet['!cols'] = fitToColumn(membersSheetData);
  requestsWorksheet['!cols'] = fitToColumn(requestsSheetData);


  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, membersWorksheet, 'Soci Attivi e Scaduti');
  XLSX.utils.book_append_sheet(workbook, requestsWorksheet, 'Richieste Iscrizione');

  const today = formatDate(new Date(), 'dd.MM.yyyy');
  XLSX.writeFile(workbook, `ELENCO SOCI AL ${today}.xlsx`);
};
