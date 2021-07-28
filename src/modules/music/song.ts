export class Song {
  /// Song title
  title: string;
  /// Song URL
  url: string;
  /// Describes the song offset in seconds
  offset: number = 0;
  /// Only users present when this song was requested can manage it
  canBeManagedBy: string[];

  constructor({title, url, canBeManagedBy = []}: {title: string, url: string, canBeManagedBy?: string[]}) {
    this.title = title;
    this.url = url;
    this.canBeManagedBy = canBeManagedBy;
  }
}