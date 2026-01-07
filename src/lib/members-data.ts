export type Member = {
  id: string;
  gender: 'male' | 'female';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthPlace: string;
  birthDate: string;
  fiscalCode: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  joinDate: string;
  membershipStatus: 'pending' | 'active' | 'rejected';
  whatsappConsent: boolean;
  privacyConsent: boolean;
};

// This data is now just for type reference and is not used in the application directly.
// All data is fetched from Firestore.
export const membersData: Member[] = [];
