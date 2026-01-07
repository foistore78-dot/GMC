export type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  status: 'pending' | 'approved' | 'rejected';
  instruments: string;
};

export const membersData: Member[] = [
  {
    id: "usr-001",
    name: "Alex Johnson",
    email: "alex.j@example.com",
    phone: "111-222-3333",
    joinDate: "2023-10-28",
    status: "approved",
    instruments: "Guitar, Vocals",
  },
  {
    id: "usr-002",
    name: "Maria Garcia",
    email: "maria.g@example.com",
    phone: "222-333-4444",
    joinDate: "2023-11-15",
    status: "approved",
    instruments: "Bass Guitar",
  },
  {
    id: "usr-003",
    name: "Samira Khan",
    email: "samira.k@example.com",
    phone: "333-444-5555",
    joinDate: "2024-01-05",
    status: "pending",
    instruments: "Drums, Percussion",
  },
  {
    id: "usr-004",
    name: "David Chen",
    email: "david.c@example.com",
    phone: "444-555-6666",
    joinDate: "2024-02-20",
    status: "pending",
    instruments: "Keyboard, Synthesizer",
  },
  {
    id: "usr-005",
    name: "Emily White",
    email: "emily.w@example.com",
    phone: "555-666-7777",
    joinDate: "2023-09-10",
    status: "rejected",
    instruments: "Violin",
  },
    {
    id: "usr-006",
    name: "Chris Lee",
    email: "chris.l@example.com",
    phone: "666-777-8888",
    joinDate: "2024-03-12",
    status: "approved",
    instruments: "Lead Guitar",
  },
  {
    id: "usr-007",
    name: "Jordan Paige",
    email: "jordan.p@example.com",
    phone: "777-888-9999",
    joinDate: "2024-04-01",
    status: "pending",
    instruments: "Saxophone, Vocals",
  },
];
