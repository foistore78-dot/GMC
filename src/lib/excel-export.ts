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
  return data.map((rawSocio) => {
    const socio = normalizeSocioData(rawSocio);
    const status = getStatus(socio, isFromMembersCollection);
    const isNew = isFromMembersCollection && status === 'active' && !socio.renewalDate;
    const tesseraNumberStr = socio.tessera ? socio.tessera.split('-').pop() || '' : '';
    const tesseraNumber = tesseraNumberStr ? parseInt(tesseraNumberStr, 10) : undefined;

    return {
      'TIPO': isFromMembersCollection ? (status === 'active' ? (isNew ? 'NUOVO SOCIO' : 'RINNOVO') : 'SOSPESO') : 'RICHIESTA', 
      'Stato': statusTranslations[status] || status,
      'N. Tessera': isNaN(tesseraNumber!) ? '' : tesseraNumber,
      'Anno Associativo': socio.membershipYear || '',
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
      'Data Richiesta': formatDate(socio.requestDate),
      'Data Ammissione': formatDate(socio.joinDate),
      'Data Rinnovo': formatDate(socio.renewalDate),
      'Data Scadenza': formatDate(socio.expirationDate),
      'Quota Versata (€)': socio.membershipFee || 0,
      'Qualifiche': socio.qualifica?.join(', ') || '',
      'Note': socio.notes || '',
      'Nome Tutore': socio.guardianFirstName || '',
      'Cognome Tutore': socio.guardianLastName || '',
      'Data Nascita Tutore': formatDate(socio.guardianBirthDate)
    };
  });
};

export const exportToExcel = async (members: Socio[], requests: Socio[]) => {
  try {
    console.log("ExportToExcel: Inizio caricamento libreria XLSX...");
    const XLSX = await import('xlsx');
    console.log("ExportToExcel: Libreria caricata.", !!XLSX.utils);

    if (!members || !requests || (members.length === 0 && requests.length === 0)) {
      if (typeof window !== 'undefined') alert("Attenzione: non ci sono dati da esportare nelle liste attuali.");
      return;
    }

    const workbook = XLSX.utils.book_new();

    const fitToColumn = (data: any[]) => {
      if (data.length === 0) return [];
      const widths: { wch: number }[] = [];
      const firstItem = data[0];
      const header = Object.keys(firstItem);
      
      for (const key of header) {
        let maxLen = key.length;
        for (const item of data) {
          const val = item[key];
          const len = val ? String(val).length : 0;
          if (len > maxLen) maxLen = len;
        }
        widths.push({ wch: maxLen + 2 });
      }
      return widths;
    };

    const activeMembers = members.filter(m => getStatus(m, true) === 'active').sort(sortByTessera);
    const activeData = formatForExcel(activeMembers, true);
    if (activeData.length > 0) {
      const worksheetActive = XLSX.utils.json_to_sheet(activeData);
      worksheetActive['!cols'] = fitToColumn(activeData);
      XLSX.utils.book_append_sheet(workbook, worksheetActive, 'Soci Attivi');
    }

    const expiredMembers = members.filter(m => getStatus(m, true) === 'expired').sort(sortByTessera);
    const expiredData = formatForExcel(expiredMembers, true);
    if (expiredData.length > 0) {
      const worksheetExpired = XLSX.utils.json_to_sheet(expiredData);
      worksheetExpired['!cols'] = fitToColumn(expiredData);
      XLSX.utils.book_append_sheet(workbook, worksheetExpired, 'Sospesi');
    }

    const pendingRequests = requests.filter(r => getStatus(r, false) === 'pending').sort(sortByRequestDate);
    const requestsData = formatForExcel(pendingRequests, false);
    if (requestsData.length > 0) {
      const worksheetRequests = XLSX.utils.json_to_sheet(requestsData);
      worksheetRequests['!cols'] = fitToColumn(requestsData);
      XLSX.utils.book_append_sheet(workbook, worksheetRequests, 'Richieste');
    }

    if (workbook.SheetNames.length === 0) {
      if (typeof window !== 'undefined') alert("Nessun dato corrispondente ai criteri di esportazione.");
      return;
    }

    const today = formatDate(new Date(), 'dd.MM.yyyy');
    const fileName = `ELENCO SOCI GMC ${today}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
    console.log("Esportazione completata.");
  } catch (error: any) {
    console.error("Errore exportToExcel:", error);
    if (typeof window !== 'undefined') alert("Errore durante l'esportazione: " + error.message);
  }
};
