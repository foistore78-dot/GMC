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
  renewalDate?: string;
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
export const sociData: Socio[] = [
    {
        "id": "1",
        "gender": "male",
        "firstName": "Mario",
        "lastName": "Rossi",
        "email": "mario.rossi@example.com",
        "phone": "3331234567",
        "birthPlace": "Roma",
        "birthDate": "1990-01-15",
        "fiscalCode": "RSSMRA90A15H501A",
        "address": "Via del Corso 1",
        "city": "Roma",
        "province": "RM",
        "postalCode": "00186",
        "requestDate": "2024-01-10T10:00:00Z",
        "status": "pending",
        "whatsappConsent": true,
        "privacyConsent": true
    },
    {
        "id": "2",
        "gender": "female",
        "firstName": "Giulia",
        "lastName": "Bianchi",
        "email": "giulia.bianchi@example.com",
        "phone": "3347654321",
        "birthPlace": "Milano",
        "birthDate": "1995-05-20",
        "fiscalCode": "BNCGLI95E60F205B",
        "address": "Piazza Duomo 1",
        "city": "Milano",
        "province": "MI",
        "postalCode": "20121",
        "requestDate": "2023-11-20T15:30:00Z",
        "joinDate": "2023-11-25T11:00:00Z",
        "expirationDate": "2024-11-25T11:00:00Z",
        "membershipStatus": "active",
        "whatsappConsent": false,
        "privacyConsent": true,
        "membershipYear": "2023",
        "tessera": "GMC-2023-1",
        "membershipFee": 10,
        "qualifica": ["MUSICISTA"]
    },
    {
        "id": "3",
        "gender": "male",
        "firstName": "Luca",
        "lastName": "Verdi",
        "email": "luca.verdi@example.com",
        "phone": "3351122334",
        "birthPlace": "Napoli",
        "birthDate": "2008-09-01",
        "fiscalCode": "VRDLCU08P01F839C",
        "address": "Via Toledo 100",
        "city": "Napoli",
        "province": "NA",
        "postalCode": "80134",
        "requestDate": "2024-03-01T09:00:00Z",
        "status": "pending",
        "whatsappConsent": true,
        "privacyConsent": true,
        "guardianFirstName": "Paolo",
        "guardianLastName": "Verdi",
        "guardianBirthDate": "1975-04-10"
    }
];

    