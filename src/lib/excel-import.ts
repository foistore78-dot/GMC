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
    const socio: Partial<Socio> = {
        tessera: row['N. Tessera'] === 'N/A' ? undefined : row['N. Tessera'],
        lastName: row['Cognome'],
        firstName: row['Nome'],
        gender: row['Genere'] === 'M' ? 'male' : 'female',
        birthDate: parseDate(row['Data di Nascita']) || undefined,
        birthPlace: row['Luogo di Nascita'],
        fiscalCode: row['Codice Fiscale'],
        address: row['Indirizzo'],
        city: row['Città'],
        province: row['Provincia'],
        postalCode: String(row['CAP'] || ''),
        email: row['Email'],
        phone: row['Telefono'] ? String(row['Telefono']) : undefined,
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
          throw new Error("Il foglio 'Soci Attivi e Scaduti' è vuoto.");
        }
        
        // Fetch existing members to check for updates
        const membersCollection = collection(firestore, 'members');
        const existingMembersQuery = query(membersCollection);
        const querySnapshot = await getDocs(existingMembersQuery);
        const existingMembersMap = new Map<string, {id: string, data: Socio}>();
        querySnapshot.forEach(doc => {
            const member = doc.data() as Socio;
            if(member.tessera) {
                existingMembersMap.set(member.tessera, {id: doc.id, data: member});
            }
        });


        const batch = writeBatch(firestore);
        let importedCount = 0;
        let errorCount = 0;

        for (const row of membersJson) {
            try {
                const socioData = excelRowToSocio(row);

                // Basic validation: skip row if essential data is missing but continue the loop
                if (!socioData.firstName || !socioData.lastName || !socioData.birthDate) {
                    console.warn("Riga saltata per mancanza di dati obbligatori (nome, cognome, data di nascita):", row);
                    errorCount++;
                    continue; // Go to the next row
                }
                
                // Check if member already exists based on tessera
                if (socioData.tessera && existingMembersMap.has(socioData.tessera)) {
                    // Update existing member
                    const existingMember = existingMembersMap.get(socioData.tessera)!;
                    const docRef = doc(firestore, 'members', existingMember.id);
                    batch.set(docRef, { ...existingMember.data, ...socioData }, { merge: true });
                } else {
                    // Create new member
                    const newDocRef = doc(membersCollection);
                    batch.set(newDocRef, {
                        ...socioData,
                        id: newDocRef.id,
                        membershipStatus: 'active',
                    });
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
