import * as XLSX from 'xlsx';
import type { Socio } from './soci-data';
import { collection, writeBatch, doc, getDocs, query, where } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

import { normalizeSocioData } from './utils';

const parseExcelDate = (excelDate: string | number | undefined): string | undefined => {
    if (typeof excelDate === 'number') {
        const date = XLSX.SSF.parse_date_code(excelDate);
        return new Date(date.y, date.m - 1, date.d).toISOString();
    }
    if (typeof excelDate === 'string') {
        const parts = excelDate.match(/(\d+)/g);
        let date;
        if (parts && parts.length >= 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            if (year > 1000 && month <= 12 && day <= 31) { // Basic DD/MM/YYYY check
                 date = new Date(Date.UTC(year, month - 1, day));
            } else if (day > 1000 && month <= 12 && year <= 31) { // Basic YYYY/MM/DD check
                 date = new Date(Date.UTC(day, month - 1, year));
            }
        }
        
        if (!date) {
             date = new Date(excelDate);
        }

        if (!isNaN(date.getTime())) {
            return date.toISOString();
        }
    }
    return undefined;
};


type PartialSocioWithStatus = Partial<Socio> & { statusForImport: 'active' | 'pending' | 'expired' };

const excelRowToSocio = (row: any): PartialSocioWithStatus => {
    // Helper per recuperare i valori in modo case-insensitive
    const getVal = (key: string) => {
        if (row[key] !== undefined) return row[key];
        const lowerKey = key.toLowerCase();
        const foundKey = Object.keys(row).find(k => k.toLowerCase() === lowerKey);
        return foundKey ? row[foundKey] : undefined;
    };

    const statusText = getVal('Stato') || 'Sospeso';
    let statusForImport: 'active' | 'pending' | 'expired' = 'pending';
    const sLower = String(statusText).toLowerCase();
    if (sLower === 'attivo') statusForImport = 'active';
    if (sLower === 'scaduto') statusForImport = 'expired';
    if (sLower === 'sospeso') statusForImport = 'pending';

    const socio: Partial<Socio> = {
        tessera: getVal('N. Tessera') ? String(getVal('N. Tessera')) : undefined,
        lastName: getVal('Cognome'),
        firstName: getVal('Nome'),
        gender: (String(getVal('Genere') || getVal('Sesso') || '')).toLowerCase().startsWith('f') ? 'female' : 'male',
        birthDate: parseExcelDate(getVal('Data di Nascita')),
        birthPlace: getVal('Luogo di Nascita'),
        fiscalCode: getVal('Codice Fiscale') || undefined,
        address: getVal('Indirizzo'),
        city: getVal('Città'),
        province: getVal('Provincia'),
        postalCode: String(getVal('CAP') || ''),
        email: getVal('Email') || undefined,
        phone: getVal('Telefono') ? String(getVal('Telefono')) : undefined,
        whatsappConsent: String(getVal('Consenso WhatsApp') || '').toUpperCase() === 'SI' || String(getVal('Consenso WhatsApp') || '').toUpperCase() === 'SÌ',
        privacyConsent: String(getVal('Consenso Privacy') || '').toUpperCase() === 'SI' || String(getVal('Consenso Privacy') || '').toUpperCase() === 'SÌ',
        membershipYear: getVal('Anno Associativo') ? String(getVal('Anno Associativo')) : undefined,
        requestDate: parseExcelDate(getVal('Data Richiesta')),
        joinDate: parseExcelDate(getVal('Data Ammissione') || getVal('Data Iscrizione')),
        renewalDate: parseExcelDate(getVal('Data Rinnovo') || getVal('Ultimo Rinnovo')),
        expirationDate: parseExcelDate(getVal('Data Scadenza') || getVal('Scadenza')),
        membershipFee: typeof getVal('Quota Versata (€)') === 'number' ? getVal('Quota Versata (€)') : 0,
        qualifica: getVal('Qualifiche') ? String(getVal('Qualifiche')).split(',').map((q: string) => q.trim().toUpperCase()) : [],
        notes: getVal('Note'),
        guardianFirstName: getVal('Nome Tutore') || getVal('Tutore')?.split(' ')[0] || undefined,
        guardianLastName: getVal('Cognome Tutore') || getVal('Tutore')?.split(' ').slice(1).join(' ') || undefined,
        guardianBirthDate: parseExcelDate(getVal('Data Nascita Tutore')),
    };
    
    Object.keys(socio).forEach(key => (socio as any)[key] === undefined && delete (socio as any)[key]);

    // Normalizziamo i dati importati
    const normalizedSocio = normalizeSocioData(socio);

    return { ...normalizedSocio, statusForImport };
};

export interface ImportResult {
  createdCount: number;
  updatedTessere: string[];
  errorCount: number;
}

export const importFromExcel = async (file: File, firestore: Firestore): Promise<ImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });

        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            throw new Error('Il file Excel non contiene fogli di lavoro.');
        }

        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const membersCollection = collection(firestore, 'members');
        const requestsCollection = collection(firestore, 'membership_requests');

        const [membersSnapshot, requestsSnapshot] = await Promise.all([
          getDocs(query(membersCollection)),
          getDocs(query(requestsCollection))
        ]);

        const existingMembersMap = new Map<string, {id: string, data: Socio}>();
        membersSnapshot.forEach(doc => {
            const member = doc.data() as Socio;
            if(member.tessera) {
                const tesseraNum = member.tessera.split('-').pop() || member.tessera;
                existingMembersMap.set(tesseraNum, {id: doc.id, data: member});
            }
        });
        
        const existingRequestsMap = new Map<string, {id: string, data: Socio}>();
        requestsSnapshot.forEach(doc => {
            const req = doc.data() as Socio;
            const key = `${req.firstName}-${req.lastName}-${req.birthDate}`;
            existingRequestsMap.set(key, {id: doc.id, data: req});
        });


        const batch = writeBatch(firestore);
        let createdCount = 0;
        const updatedTessere: string[] = [];
        let errorCount = 0;

        for (const row of jsonData) {
            try {
                const { statusForImport, ...socioData } = excelRowToSocio(row);

                if (!socioData.lastName || !socioData.firstName) {
                  errorCount++;
                  console.warn("Riga saltata perché mancano nome o cognome:", row);
                  continue;
                }
                
                const isMember = statusForImport === 'active' || statusForImport === 'expired';
                
                let docRef;
                let existingData: Partial<Socio> = {};

                if (isMember) { // 'active' or 'expired'
                    const tesseraToFind = socioData.tessera ? String(socioData.tessera).split('-').pop() : undefined;
                    
                    if (tesseraToFind && existingMembersMap.has(tesseraToFind)) {
                        const existing = existingMembersMap.get(tesseraToFind)!;
                        docRef = doc(firestore, 'members', existing.id);
                        existingData = existing.data;
                        if (!updatedTessere.includes(tesseraToFind)) {
                            updatedTessere.push(tesseraToFind);
                        }
                    } else {
                        docRef = doc(membersCollection);
                        createdCount++;
                    }

                    const dataToSet: any = {
                        ...existingData,
                        ...socioData,
                        id: docRef.id,
                        status: 'active', // Stored as active in DB
                    };
                    delete dataToSet.statusForImport;
                    batch.set(docRef, dataToSet, { merge: true });

                } else { // 'pending'
                    const requestKey = `${socioData.firstName}-${socioData.lastName}-${socioData.birthDate}`;
                    if (existingRequestsMap.has(requestKey)) {
                        const existing = existingRequestsMap.get(requestKey)!;
                        docRef = doc(firestore, 'membership_requests', existing.id);
                        existingData = existing.data;
                    } else {
                        docRef = doc(requestsCollection);
                        createdCount++;
                    }
                     const dataToSet: any = {
                        ...existingData,
                        ...socioData,
                        id: docRef.id,
                        status: 'pending',
                    };
                    delete dataToSet.statusForImport;
                    delete dataToSet.membershipStatus;
                    batch.set(docRef, dataToSet, { merge: true });
                }

            } catch (singleError) {
                console.error("Errore durante l'elaborazione di una riga:", row, singleError);
                errorCount++;
            }
        }

        await batch.commit();
        resolve({ createdCount, updatedTessere, errorCount });

      } catch (error) {
        console.error("Errore durante l'elaborazione del file Excel", error);
        reject(error);
      }
    };

    reader.onerror = (error) => {
      console.error("Errore di lettura del file:", error);
      reject(error);
    };

    reader.readAsBinaryString(file);
  });
};
