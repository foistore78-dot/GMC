export type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthPlace: string;
  birthDate: string;
  fiscalCode: string;
  joinDate: string;
  membershipStatus: 'pending' | 'active' | 'rejected';
  instruments: string;
};

// This data is now just for type reference and is not used in the application directly.
// All data is fetched from Firestore.
export const membersData: Member[] = [];
