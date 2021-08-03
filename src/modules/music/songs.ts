import { MoreVideoDetails } from "ytdl-core";

type Entry = Song | SongCollection;

export class Listing {
  content: Entry;
  get title(): string {
    if (this.content instanceof Song) return this.content.title;

    return this.content.name;
  }
  get currentSong(): Song {
    if (this.content instanceof Song) return this.content;

    return this.content.songs[this.content.currentIndex];
  }
  get info(): string {
    return this.title + (this.content instanceof SongCollection ? ` [${this.content.songs.length} songs]` : '');
  }
  /// List of IDs of users who can manage this listing
  songManagers: string[];

  constructor(content: Entry, songManagers: string[]) {
    this.content = content;
    this.songManagers = songManagers;
  }
}

export class Song {
  /// Song title
  title: string;
  /// Song URL
  url: string;
  /// Song offset in seconds
  offset: number = 0;
  /// Song span/length in seconds
  duration: number = 0;

  constructor({title, url, length}: {title: string, url: string, length: number}) {
    this.title = title;
    this.url = url;
    this.duration = length;
  }

  static fromYoutubeDetails(videoDetails: MoreVideoDetails) {
    return new Song({
      title: videoDetails.title,
      url: videoDetails.video_url,
      length: Number(videoDetails.lengthSeconds),
    })
  }
}

export class SongCollection {
  /// Name of this collection
  name: string;
  /// Songs contained inside the collection
  songs: Song[];
  /// Keeps track of which song is playing
  currentIndex: number = 0;

  constructor({name, songs}: {name: string, songs: Song[]}) {
    this.name = name;
    this.songs = songs;
  }
}