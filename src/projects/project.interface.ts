// Types for the response
export interface ProjectWithMembership {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    settings: Record<string, any>;
    metadata: Record<string, any>;
    status: string;
    visibility: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
    userRole: string;
    totalMembers: number;
  }
  
  // Query parameters interface
  export interface GetUserProjectsParams {
    status?: 'active' | 'archived' | 'suspended' | 'deleted';
    sort?: 'name' | 'createdAt' | 'updatedAt';
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    search?: string;
  }
  