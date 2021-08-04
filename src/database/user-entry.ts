export interface UserEntry {
  username: string;
  id: string;

  warnings: Map<number, string>;

  lastThanked: Map<string, string>;
  thanks: number;
  
  activityPoints: number;
  trust: number;
}

export interface DatabaseEntry {
  user: UserEntry;
  ref: string;
}