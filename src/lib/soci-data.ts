export type SignatureMetadata = {
  signedAt?: string;
  signerPhone?: string;
  method: 'SMS_OTP' | 'MANUAL_PAPER' | 'ADMIN_DIRECT';
  verificationId?: string;
  notes?: string;
  helpRequested?: boolean;
};

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
  status?: 'pending' | 'active' | 'rejected' | 'expired';
  whatsappConsent: boolean;
  privacyConsent: boolean;
  statuteConsent: boolean;
  guardianFirstName?: string;
  guardianLastName?: string;
  guardianBirthDate?: string;
  guardianPaperSigned?: boolean;
  helpRequested?: boolean;
  membershipYear?: string;
  notes?: string;
  isVolunteer?: boolean;
  membershipFee?: number;
  qualifica?: string[];
  tessera?: string;
  submittedAt?: string;
  signatureMetadata?: SignatureMetadata;
};

export const QUALIFICHE = ["FONDATORE", "VOLONTARIO", "MUSICISTA"] as const;

export const QUALIFICA_COLORS: Record<string, string> = {
  "FONDATORE": "text-yellow-400",
  "VOLONTARIO": "text-sky-400",
  "MUSICISTA": "text-fuchsia-400",
  "default": "text-gray-400",
};
