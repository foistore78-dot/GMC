import * as XLSX from 'xlsx';
import type { Socio } from './soci-data';
import { getStatus, formatDate } from '@/components/soci-table';

const statusTranslations: Record<string, string> = {
  active: 'Attivo',
  pending: 'Sospeso',
  rejected: 'Rifiutato',
  expired: 'Scaduto'
};

const formatForExcel = (data: Socio[]) => {
  return data.map(socio => {
    const status = getStatus(socio);
    const tesseraNumberStr = socio.tessera ? socio.tessera.split('-').pop() || '' : '';
    const tesseraNumber = tesseraNumberStr ? parseInt(tesseraNumberStr, 10) : undefined;

    return {
      'Stato': statusTranslations[status] || status,
      'N. Tessera': isNaN(tesseraNumber!) ? '' : tesseraNumber,
      'Cognome': socio.lastName,
      'Nome': socio.firstName,
      'Genere': socio.gender === 'male' ? 'Maschio' : 'Femmina',
      'Data di Nascita': formatDate(socio.birthDate),
      'Luogo di Nascita': socio.birthPlace,
      'Codice Fiscale': socio.fiscalCode || '',
      'Indirizzo': socio.address,
      'Città': socio.city,
      'Provincia': socio.province,
      'CAP': socio.postalCode,
      'Email': socio.email || '',
      'Telefono': socio.phone || '',
      'Consenso WhatsApp': socio.whatsappConsent ? 'SI' : 'NO',
      'Consenso Privacy': socio.privacyConsent ? 'SI' : 'NO',
      'Anno Associativo': socio.membershipYear || '',
      'Data Richiesta': formatDate(socio.requestDate),
      'Data Ammissione': formatDate(socio.joinDate),
      'Data Rinnovo': formatDate(socio.renewalDate),
      'Data Scadenza': formatDate(socio.expirationDate),
      'Quota Versata (€)': socio.membershipFee || 0,
      'Qualifiche': socio.qualifica?.join(', ') || '',
      'Cognome Tutore': socio.guardianLastName || '',
      'Nome Tutore': socio.guardianFirstName || '',
      'Data Nascita Tutore': socio.guardianBirthDate ? formatDate(socio.guardianBirthDate) : '',
      'Note': socio.notes || ''
    };
  });
};

export const exportToExcel = (members: Socio[], requests: Socio[]) => {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Elenco Completo
  const allSoci = [...members, ...requests];
  const allSociSheetData = formatForExcel(allSoci);
  const worksheetAll = XLSX.utils.json_to_sheet(allSociSheetData);
  
  // Sheet 2: Solo Nuovi Soci (Membri attivi senza data di rinnovo)
  const newMembersOnly = members.filter(m => getStatus(m) === 'active' && !m.renewalDate);
  const newMembersSheetData = formatForExcel(newMembersOnly);
  const worksheetNew = XLSX.utils.json_to_sheet(newMembersSheetData);

  const fitToColumn = (data: any[]) => {
    if (data.length === 0) return [];
    const json = data;
    const widths: { wch: number }[] = [];
    const header = Object.keys(json[0]);
    for (const key of header) {
        widths.push({ wch: Math.max(key.length, ...json.map(item => (item[key] || '').toString().length)) });
    }
    return widths;
  };
  
  worksheetAll['!cols'] = fitToColumn(allSociSheetData);
  worksheetNew['!cols'] = fitToColumn(newMembersSheetData);

  XLSX.utils.book_append_sheet(workbook, worksheetAll, 'Elenco Completo');
  XLSX.utils.book_append_sheet(workbook, worksheetNew, 'Nuovi Soci');

  const today = formatDate(new Date(), 'dd.MM.yyyy');
  XLSX.writeFile(workbook, `ELENCO SOCI AL ${today}.xlsx`);
};
