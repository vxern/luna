interface UserEntry {
  username: string;
  id: string;
  lastThanked: Map<string, number>;
  thanks: number;
  activityPoints: number;
  trust: number;
}