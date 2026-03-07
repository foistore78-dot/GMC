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

    if (dateString && typeof dateString.toDate === 'function') {
        date = dateString.toDate();
    } else if (typeof dateString === 'string') {
        date = new Date(dateString);
    } else if (dateString instanceof Date) {
        date = dateString;
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
