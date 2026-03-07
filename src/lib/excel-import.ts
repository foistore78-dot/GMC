
import * as XLSX from 'xlsx';
import type { Socio } from './soci-data';
import { collection, writeBatch, Firestore, doc, getDocs, query, where } from 'firebase/firestore';

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
        birthDate: parseExcelDate(row['Data di Nascita']),
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
        requestDate: parseExcelDate(row['Data Richiesta']),
        joinDate: parseExcelDate(row['Data Ammissione']),
        renewalDate: parseExcelDate(row['Data Rinnovo']),
        expirationDate: parseExcelDate(row['Data Scadenza']),
        membershipFee: typeof row['Quota Versata (€)'] === 'number' ? row['Quota Versata (€)'] : 0,
        qualifica: row['Qualifiche'] ? row['Qualifiche'].split(',').map((q: string) => q.trim().toUpperCase()) : [],
        notes: row['Note'] || undefined,
        guardianFirstName: row['Nome Tutore'] || undefined,
        guardianLastName: row['Cognome Tutore'] || undefined,
        guardianBirthDate: parseExcelDate(row['Data Nascita Tutore']),
    };
    
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

                    const year = socioData.membershipYear || new Date().getFullYear().toString();
                    const tesseraNumber = socioData.tessera || (await getDocs(query(collection(firestore, 'members'), where('membershipYear', '==', year)))).size + 1;
                    const fullTessera = `GMC-${year}-${String(tesseraNumber).split('-').pop()}`;

                    const dataToSet: any = {
                        ...existingData,
                        ...socioData,
                        tessera: fullTessera,
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

