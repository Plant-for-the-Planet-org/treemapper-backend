export type FlagLevel = 'error' | 'warning' | 'info';
export type FlagEntity = 'location' | 'species' | 'measurements';

export interface FlagReasonEntry {
  uid: string;
  type: FlagEntity;
  level: FlagLevel;
  title: string;
  message: string;
  updatedAt: Date;
  createdAt: Date;
}
