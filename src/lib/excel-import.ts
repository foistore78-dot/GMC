import * as XLSX from 'xlsx';
import type { Socio } from './soci-data';
import { collection, writeBatch, Firestore, doc, getDocs, query } from 'firebase/firestore';
import { parse } from 'date-fns';

const parseDate = (dateStr: string | number | undefined): string | null => {
  if (!dateStr) return null;
  // Excel sometimes stores dates as numbers (days since 1900).
  if (typeof dateStr === 'number') {
    const date = XLSX.SSF.parse_date_code(dateStr);
    return new Date(date.y, date.m - 1, date.d).toISOString();
  }
  if (typeof dateStr === 'string') {
    try {
      // Try parsing formats like dd/MM/yyyy or dd.MM.yyyy
      const parsedDate = parse(dateStr, 'dd/MM/yyyy', new Date());
       if (isNaN(parsedDate.getTime())) {
         const parsedDate2 = parse(dateStr, 'dd.MM.yyyy', new Date());
         if(isNaN(parsedDate2.getTime())) {
            // Try ISO as last resort before failing
            const isoDate = new Date(dateStr);
            if (!isNaN(isoDate.getTime())) {
                return isoDate.toISOString();
            }
            throw new Error("Invalid date format");
         }
         return parsedDate2.toISOString();
       }
      return parsedDate.toISOString();
    } catch (e) {
      // Try parsing ISO format as a fallback
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) {
        return isoDate.toISOString();
      }
      console.warn(`Could not parse date: ${dateStr}`);
      return null;
    }
  }
  return null;
};

type PartialSocioWithStatus = Partial<Socio> & { statusForImport: 'active' | 'pending' | 'expired' };

const excelRowToSocio = (row: any): PartialSocioWithStatus => {
    const statusText = row['Stato'] || 'Sospeso';
    let statusForImport: 'active' | 'pending' | 'expired' = 'pending';
    if (statusText.toLowerCase() === 'attivo') statusForImport = 'active';
    if (statusText.toLowerCase() === 'scaduto') statusForImport = 'expired';
    if (statusText.toLowerCase() === 'sospeso') statusForImport = 'pending';

    const socio: Partial<Socio> = {
        tessera: row['N. Tessera'] || undefined,
        lastName: row['Cognome'],
        firstName: row['Nome'],
        gender: (row['Genere'] || '').toUpperCase() === 'M' ? 'male' : 'female',
        birthDate: parseDate(row['Data di Nascita']) || undefined,
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
        requestDate: parseDate(row['Data Richiesta']) || undefined,
        joinDate: parseDate(row['Data Ammissione']) || undefined,
        renewalDate: parseDate(row['Data Rinnovo']) || undefined,
        expirationDate: parseDate(row['Data Scadenza']) || undefined,
        membershipFee: typeof row['Quota Versata (€)'] === 'number' ? row['Quota Versata (€)'] : 0,
        qualifica: row['Qualifiche'] ? row['Qualifiche'].split(',').map((q: string) => q.trim().toUpperCase()) : [],
        notes: row['Note'] || undefined,
        guardianFirstName: row['Nome Tutore'] || undefined,
        guardianLastName: row['Cognome Tutore'] || undefined,
        guardianBirthDate: parseDate(row['Data Nascita Tutore']) || undefined,
    };
    
    // Clean up undefined fields
    Object.keys(socio).forEach(key => (socio as any)[key] === undefined && delete (socio as any)[key]);

    return { ...socio, statusForImport };
};


export const importFromExcel = async (file: File, firestore: Firestore): Promise<{ importedCount: number; errorCount: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });

        const sheetName = 'Elenco Completo Soci';
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet) {
          throw new Error(`Il file Excel deve contenere un foglio chiamato "${sheetName}".`);
        }

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
                existingMembersMap.set(member.tessera, {id: doc.id, data: member});
            }
        });
        
        const existingRequestsMap = new Map<string, {id: string, data: Socio}>();
        requestsSnapshot.forEach(doc => {
            const req = doc.data() as Socio;
            const key = `${req.firstName}-${req.lastName}-${req.birthDate}`;
            existingRequestsMap.set(key, {id: doc.id, data: req});
        });


        const batch = writeBatch(firestore);
        let importedCount = 0;
        let errorCount = 0;

        for (const row of jsonData) {
            try {
                const { statusForImport, ...socioData } = excelRowToSocio(row);

                if (!socioData.firstName || !socioData.lastName || !socioData.birthDate) {
                    console.warn("Riga saltata per mancanza di dati obbligatori (Nome, Cognome, Data di Nascita):", row);
                    errorCount++;
                    continue;
                }
                
                const isMember = statusForImport === 'active' || statusForImport === 'expired';
                
                let docRef;
                let existingData: Partial<Socio> = {};

                if (isMember) { // 'active' or 'expired'
                    if (socioData.tessera && existingMembersMap.has(socioData.tessera)) {
                        const existing = existingMembersMap.get(socioData.tessera)!;
                        docRef = doc(firestore, 'members', existing.id);
                        existingData = existing.data;
                    } else {
                        docRef = doc(membersCollection); // Create new member if no tessera or not found
                    }
                    const dataToSet: any = {
                        ...existingData,
                        ...socioData,
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

                importedCount++;

            } catch (singleError) {
                console.error("Errore durante l'elaborazione di una riga:", row, singleError);
                errorCount++;
            }
        }

        await batch.commit();
        resolve({ importedCount, errorCount });

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
