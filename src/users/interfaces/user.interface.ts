export interface Auth0User {
    id: string;
    email: string;
    emailVerified?: boolean;
    roles: string[];
    permissions: string[];
    metadata: Record<string, any>;
  }
  
  export interface DatabaseUser {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }