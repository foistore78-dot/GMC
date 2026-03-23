
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInYears } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isDate = (d: any): d is Date => d instanceof Date && !isNaN(d.valueOf());

export const parseDate = (dateString: any): Date | null => {
    if (!dateString) return null;
    let date;

    // Gestione specifica per i Timestamp di Firestore (oggetti con toDate())
    if (dateString && typeof dateString.toDate === 'function') {
        date = dateString.toDate();
    } else if (typeof dateString === 'string') {
        date = new Date(dateString);
    } else if (dateString instanceof Date) {
        date = dateString;
    } else if (dateString?.seconds) { // Fallback per oggetti timestamp grezzi
        date = new Date(dateString.seconds * 1000);
    } else {
        return null;
    }
    
    return isDate(date) ? date : null;
}

export const isMinorCheck = (birthDate: string | undefined | Date): boolean => {
  const date = parseDate(birthDate);
  if (!date) return false;
  const today = new Date();
  return differenceInYears(today, date) < 18;
};

export const isSocioExpired = (expirationDateInput: any, membershipYear?: string): boolean => {
    const currentYear = new Date().getFullYear();
    const mYear = membershipYear ? parseInt(membershipYear, 10) : 0;
    
    if (mYear && mYear < currentYear) {
        return true;
    }

    const expirationDate = parseDate(expirationDateInput);
    if (!expirationDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    
    return expirationDate < today;
};

export const isOlderThanDays = (dateInput: any, days: number): boolean => {
    const date = parseDate(dateInput);
    if (!date) return false;
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > days;
};

export const getFullName = (socio: any) => {
    if (!socio) return '';
    const fn = socio.firstName || socio.nome || socio.Nome || '';
    const ln = socio.lastName || socio.cognome || socio.Cognome || '';
    return `${ln} ${fn}`.trim();
};

export const getStatus = (socio: any, isFromMembersCollection: boolean = true): 'active' | 'pending' | 'rejected' | 'expired' => {
    if (!socio) return 'pending';
    if (socio.status === 'rejected') return 'rejected';
    
    if (isFromMembersCollection) {
        return isSocioExpired(socio.expirationDate, socio.membershipYear) ? 'expired' : 'active';
    }
    
    if (socio.status === 'active' || socio.tessera) {
        return isSocioExpired(socio.expirationDate, socio.membershipYear) ? 'expired' : 'active';
    }
    return 'pending';
};

export const formatDate = (dateInput: any, outputFormat: string = 'dd/MM/yyyy') => {
    const date = parseDate(dateInput);
    if (!date) return '';

    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();

    if (outputFormat === 'yyyy-MM-dd') {
      return `${y}-${m}-${d}`;
    }
    
    if (outputFormat === 'dd.MM.yyyy') {
        return `${d}.${m}.${y}`;
    }
    
    return `${d}/${m}/${y}`;
};

export const formatCurrency = (value: number | undefined | null) => {
    const number = value ?? 0;
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(number);
}

export const toTitleCase = (str: string | undefined | null): string => {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const normalizeSocioData = (data: any) => {
  const normalized = { ...data };

  // Personal Info Fallbacks - copertura estesa per nomi campo storici/alternativi
  if (!normalized.firstName) {
      normalized.firstName = normalized.nome || normalized.Nome || normalized.first_name || normalized.FirstName || normalized.name || '';
  }
  if (!normalized.lastName) {
      normalized.lastName = normalized.cognome || normalized.Cognome || normalized.last_name || normalized.LastName || normalized.surname || '';
  }
  if (!normalized.birthPlace) {
      normalized.birthPlace = normalized.luogoNascita || normalized.luogo_nascita || normalized.LuogoNascita || normalized.birthplace || normalized.birth_place || '';
  }
  if (!normalized.fiscalCode) {
      normalized.fiscalCode = normalized.codiceFiscale || normalized.codice_fiscale || normalized.CodiceFiscale || normalized.cf || normalized.CF || '';
  }
  if (!normalized.gender) {
      const g = (normalized.sesso || normalized.genere || normalized.Genere || normalized.sex || '').toLowerCase();
      if (g) normalized.gender = (g === 'maschio' || g === 'm' || g === 'male') ? 'male' : 'female';
  }

  // Residence and Contacts - copertura estesa
  if (!normalized.address) {
      normalized.address = normalized.indirizzo || normalized.Indirizzo || normalized.via || normalized.Via || normalized.street || '';
  }
  if (!normalized.city) {
      normalized.city = normalized.citta || normalized.Citta || normalized.Città || normalized.città || normalized.comune || normalized.Comune || '';
  }
  if (!normalized.province) {
      normalized.province = normalized.prov || normalized.Prov || normalized.provincia || normalized.Provincia || '';
  }
  if (!normalized.postalCode) {
      normalized.postalCode = normalized.cap || normalized.Cap || normalized.CAP || normalized.postal_code || normalized.zip || '';
  }
  if (!normalized.phone) {
      normalized.phone = normalized.cellulare || normalized.Cellulare || normalized.telefono || normalized.Telefono || normalized.mobile || normalized.tel || '';
  }

  // Date Fallbacks
  if (!normalized.birthDate && (normalized.dataNascita || normalized.data_nascita)) {
      normalized.birthDate = normalized.dataNascita || normalized.data_nascita;
  }
  if (!normalized.joinDate && (normalized.dataIscrizione || normalized.dataAmmissione || normalized.iscrizione || normalized.ammissione)) {
      normalized.joinDate = normalized.dataIscrizione || normalized.dataAmmissione || normalized.iscrizione || normalized.ammissione;
  }
  if (!normalized.requestDate && (normalized.dataRichiesta || normalized.richiesta)) {
      normalized.requestDate = normalized.dataRichiesta || normalized.richiesta;
  }
  if (!normalized.renewalDate && (normalized.dataRinnovo || normalized.rinnovo)) {
      normalized.renewalDate = normalized.dataRinnovo || normalized.rinnovo;
  }
  if (!normalized.expirationDate && (normalized.dataScadenza || normalized.scadenza)) {
      normalized.expirationDate = normalized.dataScadenza || normalized.scadenza;
  }
  if (!normalized.membershipYear && (normalized.anno || normalized.annoAssociativo)) {
      normalized.membershipYear = String(normalized.anno || normalized.annoAssociativo);
  }

  // Miscellaneous
  if (!normalized.qualifica && normalized.qualifiche) {
      normalized.qualifica = normalized.qualifiche;
  }
  if (!normalized.guardianBirthDate && normalized.dataNascitaTutore) {
      normalized.guardianBirthDate = normalized.dataNascitaTutore;
  }

  const titleCaseFields = ['firstName', 'lastName', 'city', 'birthPlace', 'address', 'guardianFirstName', 'guardianLastName'];
  titleCaseFields.forEach(field => {
    if (normalized[field]) normalized[field] = toTitleCase(normalized[field]);
  });

  const upperCaseFields = ['fiscalCode', 'province'];
  upperCaseFields.forEach(field => {
    if (normalized[field]) normalized[field] = String(normalized[field]).trim().toUpperCase();
  });

  if (normalized.email) {
    normalized.email = String(normalized.email).trim().toLowerCase();
  }

  return normalized;
};
