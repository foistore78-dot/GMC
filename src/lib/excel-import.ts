import * as XLSX from 'xlsx';
import type { Socio } from './soci-data';
import { collection, writeBatch, Firestore, doc, getDocs, query } from 'firebase/firestore';

const parseExcelDate = (excelDate: string | number | undefined): string | undefined => {
    if (typeof excelDate === 'number') {
        // Excel stores dates as numbers (days since 1900-01-01, with a known bug for 1900 being a leap year).
        // The `XLSX.SSF.parse_date_code` function handles this conversion.
        const date = XLSX.SSF.parse_date_code(excelDate);
        // new Date(year, month-1, day)
        return new Date(date.y, date.m - 1, date.d).toISOString();
    }
    if (typeof excelDate === 'string') {
        // Handle common string formats like 'dd/MM/yyyy' or ISO strings
        const parts = excelDate.match(/(\d+)/g);
        let date;
        if (parts && parts.length >= 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            if (day > 31) { // Likely a YYYY-MM-DD format
                date = new Date(Date.UTC(day, month - 1, year));
            } else { // Likely a DD/MM/YYYY format
                date = new Date(Date.UTC(year, month - 1, day));
            }
        } else {
            // Fallback for ISO strings or other formats recognized by Date.parse
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
    const statusText = row['Stato'] || 'Sospeso';
    let statusForImport: 'active' | 'pending' | 'expired' = 'pending';
    if (statusText.toLowerCase() === 'attivo') statusForImport = 'active';
    if (statusText.toLowerCase() === 'scaduto') statusForImport = 'expired';
    if (statusText.toLowerCase() === 'sospeso') statusForImport = 'pending';

    const socio: Partial<Socio> = {
        tessera: row['N. Tessera'] ? String(row['N. Tessera']) : undefined,
        lastName: row['Cognome'],
        firstName: row['Nome'],
        gender: (row['Genere'] || '').toLowerCase() === 'maschio' ? 'male' : 'female',
        birthDate: parseExcelDate(row['Data di Nascita']) || undefined,
        birthPlace: row['Luogo di Nascita'],
        fiscalCode: row['Codice Fiscale'] || undefined,
        address: row['Indirizzo'],
        city: row['Città'],
        province: row['Provincia'],
        postalCode: String(row['CAP'] || ''),
        email: row['Email'] || undefined,
        phone: row['Telefono'] ? String(row['Telefono']) : undefined,
        whatsappConsent: (row['Consenso WhatsApp'] || '').toUpperCase() === 'SI',
        privacyConsent: (row['Consenso Privacy'] || '').toUpperCase() === 'SI',
        membershipYear: row['Anno Associativo'] ? String(row['Anno Associativo']) : undefined,
        requestDate: parseExcelDate(row['Data Richiesta']) || undefined,
        joinDate: parseExcelDate(row['Data Ammissione']) || undefined,
        renewalDate: parseExcelDate(row['Data Rinnovo']) || undefined,
        expirationDate: parseExcelDate(row['Data Scadenza']) || undefined,
        membershipFee: typeof row['Quota Versata (€)'] === 'number' ? row['Quota Versata (€)'] : 0,
        qualifica: row['Qualifiche'] ? row['Qualifiche'].split(',').map((q: string) => q.trim().toUpperCase()) : [],
        notes: row['Note'] || undefined,
        guardianFirstName: row['Nome Tutore'] || undefined,
        guardianLastName: row['Cognome Tutore'] || undefined,
        guardianBirthDate: parseExcelDate(row['Data Nascita Tutore']) || undefined,
    };
    
    // Clean up undefined fields
    Object.keys(socio).forEach(key => (socio as any)[key] === undefined && delete (socio as any)[key]);

    return { ...socio, statusForImport };
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
                // To handle both full tessera "GMC-YEAR-NUM" and just "NUM"
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

                if (!socioData.lastName && !socioData.firstName) {
                  errorCount++;
                  console.warn("Riga saltata perché mancano sia nome che cognome:", row);
                  continue;
                }
                
                const isMember = statusForImport === 'active' || statusForImport === 'expired';
                
                let docRef;
                let existingData: Partial<Socio> = {};

                if (isMember) { // 'active' or 'expired'
                    const tesseraToFind = socioData.tessera ? String(socioData.tessera) : undefined;
                    
                    if (tesseraToFind && existingMembersMap.has(tesseraToFind)) {
                        const existing = existingMembersMap.get(tesseraToFind)!;
                        docRef = doc(firestore, 'members', existing.id);
                        existingData = existing.data;
                        if (!updatedTessere.includes(tesseraToFind)) {
                            updatedTessere.push(tesseraToFind);
                        }
                    } else {
                        docRef = doc(membersCollection); // Create new member if no tessera or not found
                        createdCount++;
                    }

                    const year = socioData.membershipYear || new Date().getFullYear().toString();
                    const tesseraNumber = socioData.tessera || (await getDocs(membersCollection)).size + 1;
                    const fullTessera = `GMC-${year}-${tesseraNumber}`;

                    const dataToSet: any = {
                        ...existingData,
                        ...socioData,
                        tessera: fullTessera,
                        id: docRef.id,
                        membershipStatus: 'active',
                    };
                    delete dataToSet.statusForImport;
                    delete dataToSet.status;
                    batch.set(docRef, dataToSet, { merge: true });

                } else { // 'pending'
                    const requestKey = `${socioData.firstName}-${socioData.lastName}-${socioData.birthDate}`;
                    if (existingRequestsMap.has(requestKey)) {
                        const existing = existingRequestsMap.get(requestKey)!;
                        docRef = doc(firestore, 'membership_requests', existing.id);
                        existingData = existing.data;
                    } else {
                        docRef = doc(requestsCollection); // Create new request
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
