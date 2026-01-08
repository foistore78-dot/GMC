export type Socio = {
  id: string;
  gender: 'male' | 'female';
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  birthPlace: string;
  birthDate: string;
  fiscalCode: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  joinDate?: string;
  requestDate?: string;
  expirationDate?: string;
  membershipStatus?: 'pending' | 'active' | 'rejected';
  status?: 'pending' | 'active' | 'rejected';
  whatsappConsent: boolean;
  privacyConsent: boolean;
  guardianFirstName?: string;
  guardianLastName?: string;
  guardianBirthDate?: string;
  membershipYear?: string;
  notes?: string;
  isVolunteer?: boolean;
  membershipFee?: number;
  qualifica?: string[];
  tessera?: string;
};

// This data is now for type reference and is not used in the application directly.
// All data is fetched from Firestore.
export const sociData: Socio[] = [];
