import { TreeStatus } from "./create-tree.dto";

export class TreeResponseDto {
  id: string;
  siteId: string;
  userSpeciesId?: string;
  identifier?: string;
  latitude: number;
  longitude: number;
  height?: number;
  diameter?: number;
  plantingDate?: string;
  status?: TreeStatus;
  healthNotes?: string;
  images?: string[];
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
  
  // Relations
  site?: {
    id: string;
    name: string;
    projectId: string;
  };
  
  userSpecies?: {
    id: string;
    localName?: string;
    species: {
      id: string;
      scientificName: string;
      commonName?: string;
    };
  };
  
  createdBy?: {
    id: string;
    name?: string;
    email: string;
  };
  
  records?: TreeRecordResponseDto[];
}

export class TreeRecordResponseDto {
  id: string;
  treeId: string;
  recordType: string;
  recordDate: Date;
  notes?: string;
  height?: number;
  diameter?: number;
  status?: TreeStatus;
  createdById: string;
  createdAt: Date;
  metadata?: Record<string, any>;
  
  createdBy?: {
    id: string;
    name?: string;
    email: string;
  };
}

export class PaginatedTreeResponseDto {
  data: TreeResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}