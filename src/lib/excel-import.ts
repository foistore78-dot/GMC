import * as XLSX from 'xlsx';
import type { Socio } from './soci-data';
import { collection, writeBatch, Firestore, doc } from 'firebase/firestore';
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
         if(isNaN(parsedDate2.getTime())) throw new Error("Invalid date format");
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

const excelRowToSocio = (row: any): Partial<Socio> => {
    const addressString = row['Indirizzo'] || '';
    
    // Improved address parsing logic
    const addressMatch = addressString.match(/^(.*?),?\s*(\d{5})\s*(.*?)\s*\((\w{2})\)$/);

    let address = '';
    let postalCode = '';
    let city = '';
    let province = '';

    if (addressMatch) {
        address = addressMatch[1]?.trim() || '';
        postalCode = addressMatch[2]?.trim() || '';
        city = addressMatch[3]?.trim() || '';
        province = addressMatch[4]?.trim() || '';
    } else {
        // Fallback for simpler cases or if format is just address
        const parts = addressString.split(',');
        address = parts[0]?.trim() || '';
    }

    const socio: Partial<Socio> = {
        tessera: row['N. Tessera'] === 'N/A' ? undefined : row['N. Tessera'],
        lastName: row['Cognome'],
        firstName: row['Nome'],
        gender: row['Genere'] === 'M' ? 'male' : 'female',
        birthDate: parseDate(row['Data di Nascita']) || undefined,
        birthPlace: row['Luogo di Nascita'],
        fiscalCode: row['Codice Fiscale'],
        address: address,
        city: city,
        province: province,
        postalCode: postalCode,
        email: row['Email'],
        phone: row['Telefono'],
        whatsappConsent: (row['Consenso WhatsApp'] || '').toUpperCase() === 'SI',
        privacyConsent: (row['Consenso Privacy'] || '').toUpperCase() === 'SI',
        membershipYear: row['Anno Associativo'] ? String(row['Anno Associativo']) : undefined,
        requestDate: parseDate(row['Data Richiesta']) || undefined,
        joinDate: parseDate(row['Data Ammissione']) || undefined,
        renewalDate: parseDate(row['Data Rinnovo']) || undefined,
        expirationDate: parseDate(row['Data Scadenza']) || undefined,
        membershipFee: typeof row['Quota Versata (€)'] === 'number' ? row['Quota Versata (€)'] : 0,
        qualifica: row['Qualifiche'] ? row['Qualifiche'].split(',').map((q: string) => q.trim()) : [],
        notes: row['Note'],
        membershipStatus: 'active',
    };
    
    if (row['Tutore']) {
        const guardianNameParts = (row['Tutore'] as string).split(' ');
        socio.guardianLastName = guardianNameParts[0];
        socio.guardianFirstName = guardianNameParts.slice(1).join(' ');
        socio.guardianBirthDate = parseDate(row['Data Nascita Tutore']) || undefined;
    }

    // Clean up undefined fields
    Object.keys(socio).forEach(key => (socio as any)[key] === undefined && delete (socio as any)[key]);

    return socio;
};


export const importFromExcel = async (file: File, firestore: Firestore): Promise<{ importedCount: number; errorCount: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        const membersSheetName = 'Soci Attivi e Scaduti';
        const membersSheet = workbook.Sheets[membersSheetName];
        
        if (!membersSheet) {
          throw new Error(`Il file Excel deve contenere un foglio chiamato "${membersSheetName}".`);
        }

        const membersJson = XLSX.utils.sheet_to_json(membersSheet);
        
        if (membersJson.length === 0) {
          // If the main sheet is empty, check the requests sheet as a fallback
           const requestsSheetName = 'Richieste Iscrizione';
           if(workbook.Sheets[requestsSheetName]) {
                const requestsJson = XLSX.utils.sheet_to_json(workbook.Sheets[requestsSheetName]);
                if(requestsJson.length > 0) {
                    membersJson.push(...requestsJson);
                } else {
                     throw new Error("Il foglio 'Soci Attivi e Scaduti' è vuoto.");
                }
           } else {
             throw new Error("Il foglio 'Soci Attivi e Scaduti' è vuoto.");
           }
        }

        const batch = writeBatch(firestore);
        let importedCount = 0;
        let errorCount = 0;
        const membersCollection = collection(firestore, 'members');

        for (const row of membersJson) {
            try {
                const socioData = excelRowToSocio(row);

                // Basic validation: skip row if essential data is missing but continue the loop
                if (!socioData.firstName || !socioData.lastName || !socioData.birthDate) {
                    console.warn("Riga saltata per mancanza di dati obbligatori (nome, cognome, data di nascita):", row);
                    errorCount++;
                    continue; // Go to the next row
                }
                
                // All imported members go to 'members' collection
                const newDocRef = doc(membersCollection); // Correctly get a new document reference
                batch.set(newDocRef, {
                    ...socioData,
                    id: newDocRef.id, // Ensure ID is set
                    membershipStatus: 'active', // All imported are considered active
                });

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
