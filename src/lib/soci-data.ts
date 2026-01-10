export type Socio = {
  id: string;
  gender: 'male' | 'female';
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  birthPlace: string;
  birthDate: string;
  fiscalCode?: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  joinDate?: string;
  requestDate?: string;
  expirationDate?: string;
  renewalDate?: string;
  // This is the single source of truth for the member's current state.
  // 'active' documents are in the 'members' collection.
  // 'pending' and 'rejected' documents are in the 'membership_requests' collection.
  // 'expired' is a derived status on the client for active members whose expirationDate is in the past.
  status?: 'pending' | 'active' | 'rejected' | 'expired';
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
