export interface UserEntry {
  username: string;
  id: string;

  warnings: {};

  lastThanked: {};
  thanks: number;
  
  activityPoints: number;
  trust: number;
}

export interface DatabaseEntry {
  user: UserEntry;
  ref: string;
}