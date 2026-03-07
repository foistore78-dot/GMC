
export type Project = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  thumbnailUrl?: string;
  data: Record<string, any>[];
  schema?: {
    entities: string[];
    structure: string;
    explanation: string;
  };
};

export type UserSession = {
  id: string;
  name: string;
  email: string;
  isLoggedIn: boolean;
};
