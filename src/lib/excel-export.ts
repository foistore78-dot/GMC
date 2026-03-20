import * as XLSX from 'xlsx';
import type { Socio } from './soci-data';
import { getStatus, formatDate, normalizeSocioData } from '@/lib/utils';

const statusTranslations: Record<string, string> = {
  active: 'Attivo',
  pending: 'In Attesa',
  rejected: 'Rifiutato',
  expired: 'Scaduto'
};

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

const formatForExcel = (data: Socio[], isFromMembersCollection: boolean) => {
  return data.map(rawSocio => {
    const socio = normalizeSocioData(rawSocio);
    const status = getStatus(socio, isFromMembersCollection);
    const isNew = isFromMembersCollection && status === 'active' && !socio.renewalDate;
    const tesseraNumberStr = socio.tessera ? socio.tessera.split('-').pop() || '' : '';
    const tesseraNumber = tesseraNumberStr ? parseInt(tesseraNumberStr, 10) : undefined;

    return {
      'TIPO': isFromMembersCollection ? (status === 'active' ? (isNew ? 'NUOVO SOCIO' : 'RINNOVO') : 'SOSPESO') : 'RICHIESTA', 
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
  console.log("Inizio esportazione Excel...", { membersCount: members.length, requestsCount: requests.length });
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

  const activeMembers = members.filter(m => getStatus(m, true) === 'active').sort(sortByTessera);
  console.log("Soci attivi filtrati:", activeMembers.length);
  const activeData = formatForExcel(activeMembers, true);
  const worksheetActive = XLSX.utils.json_to_sheet(activeData);
  worksheetActive['!cols'] = fitToColumn(activeData);
  XLSX.utils.book_append_sheet(workbook, worksheetActive, 'Soci Attivi');

  const expiredMembers = members.filter(m => getStatus(m, true) === 'expired').sort(sortByTessera);
  console.log("Sospesi filtrati:", expiredMembers.length);
  const expiredData = formatForExcel(expiredMembers, true);
  const worksheetExpired = XLSX.utils.json_to_sheet(expiredData);
  worksheetExpired['!cols'] = fitToColumn(expiredData);
  XLSX.utils.book_append_sheet(workbook, worksheetExpired, 'Sospesi');

  // Includiamo TUTTE le richieste presenti, senza filtraggi di stato stringenti
  const pendingRequests = [...requests].sort(sortByRequestDate);
  console.log("Richieste filtrate:", pendingRequests.length);
  const requestsData = formatForExcel(pendingRequests, false);
  const worksheetRequests = XLSX.utils.json_to_sheet(requestsData);
  worksheetRequests['!cols'] = fitToColumn(requestsData);
  XLSX.utils.book_append_sheet(workbook, worksheetRequests, 'Richieste');

  const today = formatDate(new Date(), 'dd.MM.yyyy');
  console.log("Generando file:", `ELENCO SOCI GMC ${today}.xlsx`);
  try {
    XLSX.writeFile(workbook, `ELENCO SOCI GMC ${today}.xlsx`);
    console.log("Esportazione completata con successo.");
  } catch (error) {
    console.error("Errore durante la scrittura del file Excel:", error);
  }
};
