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
            if (year > 1000 && month <= 12 && day <= 31) {
                 date = new Date(Date.UTC(year, month - 1, day));
            } else if (day > 1000 && month <= 12 && year <= 31) {
                 date = new Date(Date.UTC(day, month - 1, year));
            }
        }
        if (!date) date = new Date(excelDate);
        if (!isNaN(date.getTime())) return date.toISOString();
    }
    return undefined;
};

const parseSignatureFromExcel = (val: any): any => {
    if (!val) return undefined;
    const str = String(val).trim();
    const strLower = str.toLowerCase();
    
    if (strLower.includes('otp')) {
        const phoneMatch = str.match(/Tel:\s*([^\s-]+)/i);
        const dateMatch = str.match(/Data:\s*([^\s-]+(?:\s+[^\s-]+)?)/i);
        const idMatch = str.match(/ID:\s*([^\s-]+)/i);
        
        let signedAt: string | undefined = undefined;
        if (dateMatch && dateMatch[1]) {
            const dateStr = dateMatch[1].trim();
            const parts = dateStr.match(/(\d+)/g);
            if (parts && parts.length >= 5) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const year = parseInt(parts[2], 10);
                const hour = parseInt(parts[3], 10);
                const min = parseInt(parts[4], 10);
                signedAt = new Date(Date.UTC(year, month - 1, day, hour, min)).toISOString();
            } else {
                const parsed = new Date(dateStr);
                if (!isNaN(parsed.getTime())) signedAt = parsed.toISOString();
            }
        }
        
        return {
            method: 'SMS_OTP',
            signerPhone: phoneMatch ? phoneMatch[1].trim() : '',
            signedAt: signedAt || new Date().toISOString(),
            verificationId: idMatch ? idMatch[1].trim() : 'OTP-IMPORTED',
            notes: 'Firma Elettronica Semplice verificata via SMS OTP da pannello amministrativo (Importata da Excel)'
        };
    } else if (strLower.includes('cartaceo') || strLower.includes('cartacea')) {
        return {
            method: 'MANUAL_PAPER',
            notes: 'Socio registrato con modulo cartaceo / storico'
        };
    } else if (strLower.includes('admin') || strLower.includes('mancante')) {
        return {
            method: 'ADMIN_DIRECT',
            notes: 'Registrato da amministratore (Firma mancante)'
        };
    }
    return undefined;
};

type PartialSocioWithStatus = Partial<Socio> & { statusForImport: 'active' | 'pending' | 'expired' | 'rejected' };

const excelRowToSocio = (row: any): PartialSocioWithStatus => {
    const getVal = (key: string) => {
        if (row[key] !== undefined) return row[key];
        const lowerKey = key.toLowerCase();
        const foundKey = Object.keys(row).find(k => k.toLowerCase() === lowerKey);
        return foundKey ? row[foundKey] : undefined;
    };

    const statusText = getVal('Stato');
    const tipoText = getVal('TIPO');
    const expirationDateStr = parseExcelDate(getVal('Data Scadenza') || getVal('Scadenza'));
    
    let statusForImport: 'active' | 'pending' | 'expired' | 'rejected' = 'pending';

    if (statusText) {
        const sLower = String(statusText).toLowerCase();
        if (sLower === 'attivo') statusForImport = 'active';
        else if (sLower === 'scaduto') statusForImport = 'expired';
        else if (sLower === 'respinto' || sLower === 'rifiutato') statusForImport = 'rejected';
        else statusForImport = 'pending';
    } else if (tipoText) {
        const tUpper = String(tipoText).toUpperCase();
        if (tUpper === 'RICHIESTA') statusForImport = 'pending';
        else if (tUpper === 'RIFIUTATO' || tUpper === 'RESPINTO') statusForImport = 'rejected';
        else {
            if (expirationDateStr) {
                const expDate = new Date(expirationDateStr);
                const now = new Date();
                statusForImport = expDate > now ? 'active' : 'expired';
            } else {
                statusForImport = 'active';
            }
        }
    }

    const signatureVal = getVal('Firma');
    const signatureMetadata = parseSignatureFromExcel(signatureVal);

    const guardianSignatureVal = getVal('Firma Tutore') || getVal('Firma del Tutore') || getVal('FirmaTutore');
    const guardianSignatureMetadata = parseSignatureFromExcel(guardianSignatureVal);

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
        expirationDate: expirationDateStr,
        membershipFee: typeof getVal('Quota Versata (€)') === 'number' ? getVal('Quota Versata (€)') : 0,
        qualifica: getVal('Qualifiche') ? String(getVal('Qualifiche')).split(',').map((q: string) => q.trim().toUpperCase()) : [],
        signatureMetadata: signatureMetadata || undefined,
        notes: getVal('Note'),
        guardianFirstName: getVal('Nome Tutore') || getVal('Tutore')?.split(' ')[0] || undefined,
        guardianLastName: getVal('Cognome Tutore') || getVal('Tutore')?.split(' ').slice(1).join(' ') || undefined,
        guardianBirthDate: parseExcelDate(getVal('Data Nascita Tutore')),
        guardianSignatureMetadata: guardianSignatureMetadata || undefined,
        guardianPaperSigned: guardianSignatureMetadata?.method === 'MANUAL_PAPER' ? true : undefined,
    };
    
    Object.keys(socio).forEach(key => (socio as any)[key] === undefined && delete (socio as any)[key]);
    return { ...normalizeSocioData(socio), statusForImport };
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

        // Priorità al foglio "TUTTI" o "ELENCO" o il primo disponibile
        let sheetName = workbook.SheetNames.find(n => n.toUpperCase() === 'TUTTI' || n.toUpperCase() === 'ELENCO_COMPLETO');
        if (!sheetName) sheetName = workbook.SheetNames[0];

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
                  continue;
                }
                
                const isMember = statusForImport === 'active' || statusForImport === 'expired';
                const isRejected = statusForImport === 'rejected';
                
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
                        status: statusForImport, 
                    };
                    delete dataToSet.statusForImport;
                    batch.set(docRef, dataToSet, { merge: true });

                } else { // 'pending' or 'rejected'
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
                        status: isRejected ? 'rejected' : 'pending',
                    };
                    delete dataToSet.statusForImport;
                    delete dataToSet.membershipStatus;
                    batch.set(docRef, dataToSet, { merge: true });
                }

            } catch (singleError) {
                errorCount++;
            }
        }

        await batch.commit();
        resolve({ createdCount, updatedTessere, errorCount });

      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsBinaryString(file);
  });
};
