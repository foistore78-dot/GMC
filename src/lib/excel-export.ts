import * as XLSX from 'xlsx';
import type { Socio } from './soci-data';
import { getStatus, formatDate } from '@/lib/utils';

const statusTranslations: Record<string, string> = {
  active: 'Attivo',
  pending: 'Sospeso',
  rejected: 'Rifiutato',
  expired: 'Scaduto'
};

/**
 * Ordina i soci per Anno Associativo (decrescente) e poi per Numero di Tessera (crescente).
 */
const sortByTessera = (a: Socio, b: Socio) => {
  if (!a.tessera && !b.tessera) return 0;
  if (!a.tessera) return 1;
  if (!b.tessera) return -1;
  
  const partsA = a.tessera.split('-');
  const partsB = b.tessera.split('-');
  
  const yearA = parseInt(partsA[1], 10) || 0;
  const yearB = parseInt(partsB[1], 10) || 0;
  
  if (yearA !== yearB) return yearB - yearA;
  
  const numA = parseInt(partsA[2], 10) || 0;
  const numB = parseInt(partsB[2], 10) || 0;
  
  return numA - numB;
};

const sortByRequestDate = (a: Socio, b: Socio) => {
  const dateA = a.requestDate ? new Date(a.requestDate).getTime() : 0;
  const dateB = b.requestDate ? new Date(b.requestDate).getTime() : 0;
  return dateB - dateA;
};

const formatForExcel = (data: Socio[]) => {
  return data.map(socio => {
    const status = getStatus(socio);
    const isNew = status === 'active' && !socio.renewalDate;
    const tesseraNumberStr = socio.tessera ? socio.tessera.split('-').pop() || '' : '';
    const tesseraNumber = tesseraNumberStr ? parseInt(tesseraNumberStr, 10) : undefined;

    return {
      'NUOVO SOCIO': isNew ? 'SI (NUOVO)' : (status === 'active' ? 'RINNOVO' : ''), 
      'Stato': statusTranslations[status] || status,
      'N. Tessera': isNaN(tesseraNumber!) ? '' : tesseraNumber,
      'Anno': socio.membershipYear || '',
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
      'Data Richiesta': formatDate(socio.requestDate),
      'Data Ammissione': formatDate(socio.joinDate),
      'Data Rinnovo': formatDate(socio.renewalDate),
      'Data Scadenza': formatDate(socio.expirationDate),
      'Quota Versata (€)': socio.membershipFee || 0,
      'Qualifiche': socio.qualifica?.join(', ') || '',
      'Note': socio.notes || ''
    };
  });
};

export const exportToExcel = (members: Socio[], requests: Socio[]) => {
  const workbook = XLSX.utils.book_new();

  const fitToColumn = (data: any[]) => {
    if (data.length === 0) return [];
    const widths: { wch: number }[] = [];
    const header = Object.keys(data[0]);
    for (const key of header) {
        widths.push({ wch: Math.max(key.length, ...data.map(item => (item[key] || '').toString().length)) });
    }
    return widths;
  };

  const activeMembers = members.filter(m => getStatus(m) === 'active').sort(sortByTessera);
  const activeData = formatForExcel(activeMembers);
  const worksheetActive = XLSX.utils.json_to_sheet(activeData);
  worksheetActive['!cols'] = fitToColumn(activeData);
  XLSX.utils.book_append_sheet(workbook, worksheetActive, 'Soci Attivi');

  const newMembers = members.filter(m => getStatus(m) === 'active' && !m.renewalDate).sort(sortByTessera);
  const newData = formatForExcel(newMembers);
  const worksheetNew = XLSX.utils.json_to_sheet(newData);
  worksheetNew['!cols'] = fitToColumn(newData);
  XLSX.utils.book_append_sheet(workbook, worksheetNew, 'Nuovi Soci');

  const expiredMembers = members.filter(m => getStatus(m) === 'expired').sort(sortByTessera);
  const expiredData = formatForExcel(expiredMembers);
  const worksheetExpired = XLSX.utils.json_to_sheet(expiredData);
  worksheetExpired['!cols'] = fitToColumn(expiredData);
  XLSX.utils.book_append_sheet(workbook, worksheetExpired, 'Sospesi');

  const pendingRequests = requests.filter(r => getStatus(r) === 'pending').sort(sortByRequestDate);
  const requestsData = formatForExcel(pendingRequests);
  const worksheetRequests = XLSX.utils.json_to_sheet(requestsData);
  worksheetRequests['!cols'] = fitToColumn(requestsData);
  XLSX.utils.book_append_sheet(workbook, worksheetRequests, 'Richieste');

  const today = formatDate(new Date(), 'dd.MM.yyyy');
  XLSX.writeFile(workbook, `ELENCO SOCI AL ${today}.xlsx`);
};
